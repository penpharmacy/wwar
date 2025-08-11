// script.js

const dayNames = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

document.getElementById('calculateBtn').addEventListener('click', calculateDose);

function calculateDose() {
  const mode = document.getElementById('mode').value;
  const inr = parseFloat(document.getElementById('inr').value);
  const bleeding = document.getElementById('bleeding').value;
  const currentWeeklyDose = parseFloat(document.getElementById('weeklyDose').value);
  const manualPercent = parseFloat(document.getElementById('manualPercent').value || 0) / 100;

  const resultBox = document.getElementById('output');
  resultBox.innerHTML = '';

  if (isNaN(inr) || isNaN(currentWeeklyDose)) {
    resultBox.innerHTML = `<div class="card">กรุณากรอกค่า INR และขนาดยาเดิมให้ครบถ้วน</div>`;
    return;
  }

  let newWeeklyDose = currentWeeklyDose;
  let advice = '';
  let override = false;

  if (mode === 'auto') {
    const adj = getAdjustment(inr, bleeding);
    advice = adj.text;
    override = adj.override;
    newWeeklyDose = override ? 0 : currentWeeklyDose * (1 + adj.percent);
  } else {
    advice = `ผู้ใช้เลือกปรับขนาดยา ${manualPercent > 0 ? '+' : ''}${manualPercent * 100}%`;
    newWeeklyDose = currentWeeklyDose * (1 + manualPercent);
  }

  const summary = document.createElement('div');
  summary.className = 'card info';
  summary.innerHTML = `
    <strong>ขนาดยาใหม่:</strong> ${newWeeklyDose.toFixed(2)} mg/สัปดาห์<br>
    <strong>เฉลี่ย:</strong> ${(newWeeklyDose / 7).toFixed(2)} mg/วัน
  `;
  resultBox.appendChild(summary);

  const recommendation = document.createElement('div');
  recommendation.className = 'card';
  recommendation.innerHTML = `<strong>คำแนะนำ:</strong> ${advice}`;
  resultBox.appendChild(recommendation);

  if (override) return;

  const dailyPlan = distributeDose(newWeeklyDose);

  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
    <tr>
      <th>วัน</th>
      <th>ขนาดยา</th>
      <th>เม็ดยา</th>
      <th>ภาพ</th>
    </tr>
  `;

  for (let i = 0; i < dailyPlan.length; i++) {
    const d = dailyPlan[i];
    const row = document.createElement('tr');
    const pills = [];

    for (let p of d.pills) {
      if (p === 2) pills.push('<span class="pill pill-2mg"></span>');
      else if (p === 3) pills.push('<span class="pill pill-3mg"></span>');
      else if (p === 1) pills.push('<span class="pill pill-half-2mg"></span>');
      else if (p === 1.5) pills.push('<span class="pill pill-half-3mg"></span>');
    }

    row.innerHTML = `
      <td>${dayNames[i]}</td>
      <td>${d.totalDose.toFixed(1)} mg</td>
      <td>${pills.map(p => p.includes('pill-2mg') ? '2' : '3').join(', ')} mg</td>
      <td><div class="day-pill">${pills.join('')}</div></td>
    `;
    table.appendChild(row);
  }

  resultBox.appendChild(table);
}

function getAdjustment(inr, bleeding) {
  if (bleeding === 'major') {
    return { percent: 0, text: "ให้ Vitamin K₁ 10 mg IV + FFP และ repeat ทุก 12 ชม.", override: true };
  }
  if (inr >= 9.0) return { percent: 0, text: "ให้ Vitamin K₁ 5–10 mg oral", override: true };
  if (inr > 5.0) return { percent: 0, text: "หยุดยา 1–2 วัน + Vitamin K₁ 1 mg oral", override: true };
  if (inr > 4.0) return { percent: -0.10, text: "หยุดยา 1 วัน แล้วลดขนาดยา 10%" };
  if (inr > 3.0) return { percent: -0.075, text: "ลดขนาดยา 5–10%" };
  if (inr >= 2.0) return { percent: 0, text: "ให้ขนาดยาเท่าเดิม" };
  if (inr >= 1.5) return { percent: 0.075, text: "เพิ่มขนาดยา 5–10%" };
  return { percent: 0.15, text: "เพิ่มขนาดยา 10–20%" };
}

function distributeDose(total) {
  const days = 7;
  const dose3mg = 3;
  const dose2mg = 2;
  
  // จำนวนครึ่งเม็ด (half unit) = จำนวนเม็ด * 2
  // ใช้หน่วย half unit เพราะแจกครึ่งเม็ดได้ เช่น 0.5 เม็ด = 1 half unit
  const totalHalfUnits3mg = Math.round((total / dose3mg) * 2); // ประมาณครึ่งเม็ด 3mg ที่ควรใช้
  const totalHalfUnits2mg = Math.round((total / dose2mg) * 2); // ประมาณครึ่งเม็ด 2mg ที่ควรใช้

  // แต่เราต้องแจกผสม 3 mg และ 2 mg รวมกันได้ใกล้เคียง total
  // จะใช้วิธี loop หาจำนวนครึ่งเม็ด 3mg และ 2mg ที่รวมกันใกล้ total มากที่สุด

  let bestCombo = null;
  let minDiff = Infinity;

  // กำหนดขอบเขตจำนวนครึ่งเม็ด (0 ถึง 14 เม็ดเต็ม = 28 half units)
  const maxHalf3 = Math.min(14 * 2, Math.floor(total / dose3mg) * 2 + 4); 
  const maxHalf2 = Math.min(21 * 2, Math.floor(total / dose2mg) * 2 + 4);

  for (let h3 = 0; h3 <= maxHalf3; h3++) {
    for (let h2 = 0; h2 <= maxHalf2; h2++) {
      const totalMg = (h3 / 2) * dose3mg + (h2 / 2) * dose2mg;
      const diff = Math.abs(totalMg - total);
      if (diff < minDiff) {
        // ต้องตรวจสอบอย่างน้อยมีวันนึงแจกทั้ง 3mg และ 2mg พร้อมกัน (อย่างน้อยครึ่งเม็ด)
        // 7 วันแจก ถ้าแจก 3mg ครึ่งเม็ด h3 half units, 2mg ครึ่งเม็ด h2 half units
        // เราจะแจกเท่าๆกันก่อน (distributeEvenly) แล้วดูว่ามีวันไหนแจกพร้อมกันมั้ย
        let perDay3 = distributeEvenly(h3, days);
        let perDay2 = distributeEvenly(h2, days);

        let hasBothDay = perDay3.some((v, i) => v > 0 && perDay2[i] > 0);

        if (hasBothDay && diff < minDiff) {
          minDiff = diff;
          bestCombo = { h3, h2, total: totalMg };
        }
      }
    }
  }

  if (!bestCombo) {
    // ถ้าไม่เจอแผนที่มีวันแจกทั้ง 3mg และ 2mg พร้อมกัน ให้เลือกใกล้เคียงสุดไม่สนใจเงื่อนไขนี้
    bestCombo = { h3: totalHalfUnits3mg, h2: 0, total: totalHalfUnits3mg / 2 * dose3mg };
  }

  // แจกยา 7 วัน
  const perDay3 = distributeEvenly(bestCombo.h3, days);
  const perDay2 = distributeEvenly(bestCombo.h2, days);

  const results = [];

  for (let i = 0; i < days; i++) {
    results.push({
      totalDose: (perDay3[i] / 2) * dose3mg + (perDay2[i] / 2) * dose2mg,
      pills: [
        perDay3[i] > 0 ? (perDay3[i] / 2) : 0,
        perDay2[i] > 0 ? (perDay2[i] / 2) : 0,
      ].filter(x => x > 0)
    });
  }

  return results;
}

// ฟังก์ชันช่วยแจกให้เท่าๆกัน
function distributeEvenly(totalHalfUnits, days) {
  const base = Math.floor(totalHalfUnits / days);
  const remainder = totalHalfUnits % days;
  const arr = Array(days).fill(base);
  for (let i = 0; i < remainder; i++) {
    arr[i]++;
  }
  return arr;
}

