

// helper round half
function roundHalf(x) { return Math.round(x * 2) / 2 }

// distribute integer half-units across days (half-unit = 0.5 tablet)
function distributeEvenly(totalHalfUnits, days) {
  const base = Math.floor(totalHalfUnits / days);
  let arr = Array(days).fill(base);
  let rem = totalHalfUnits - base * days;
  for (let i = 0; i < rem; i++) arr[i]++;
  return arr;
}

// Find best weekly combination of 3mg and 2mg half-units to match target (mg)
function findBestCombo(target) {
  let best = null;
  let bestDiff = Infinity;
  const maxHalf3 = 60;
  const maxHalf2 = 80;
  for (let h3 = 0; h3 <= maxHalf3; h3++) {
    const mg3 = h3 * 1.5;
    let rem = target - mg3;
    if (rem < -10) continue;
    const estH2 = Math.round(rem / 1);
    const start = Math.max(0, estH2 - 6);
    const end = Math.min(maxHalf2, estH2 + 6);
    for (let h2 = start; h2 <= end; h2++) {
      const total = mg3 + h2 * 1;
      const diff = Math.abs(total - target);
      if (
        diff < bestDiff - 1e-9 ||
        (Math.abs(diff - bestDiff) < 1e-9 && h3 > (best?.h3 || 0))
      ) {
        bestDiff = diff;
        best = { h3, h2, total };
        if (bestDiff < 0.01) return best;
      }
    }
  }
  return best;
}

function buildPlanHTML(title, combo, days) {
  const h3 = combo.h3;
  const h2 = combo.h2;
  const total = combo.total;
  const perDay3 = distributeEvenly(h3, 7);
  const perDay2 = distributeEvenly(h2, 7);
  let html = `<h4>${title} — รวม ${total.toFixed(1)} mg/สัปดาห์</h4>`;
  html += `<table><thead><tr><th>วัน</th><th>3 mg (เม็ด)</th><th>2 mg (เม็ด)</th><th>รวม (mg)</th></tr></thead><tbody>`;
  const dayNames = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
  let weeklySum = 0;
  for (let i = 0; i < 7; i++) {
    const t3 = perDay3[i] / 2;
    const t2 = perDay2[i] / 2;
    const mg = t3 * 3 + t2 * 2;
    weeklySum += mg;
    html += `<tr><td>${dayNames[i]}</td><td>${
      t3 % 1 === 0 ? t3 : t3.toFixed(1)
    } </td><td>${t2 % 1 === 0 ? t2 : t2.toFixed(1)}</td><td>${mg.toFixed(1)}</td></tr>`;
  }
  html += `<tfoot><tr><th colspan="3">ยอดรวมในตาราง</th><th>${weeklySum.toFixed(
    1
  )} mg</th></tr></tfoot></table>`;
  return html;
}

// ฟังก์ชันคำนวณจำนวนเม็ดรวมตามวันนัด
function calculateTotalPills(perDay3, perDay2, followUpDays) {
  const weeks = followUpDays / 7;
  let total3mg = 0;
  let total2mg = 0;
  for (let i = 0; i < 7; i++) {
    total3mg += perDay3[i] / 2;
    total2mg += perDay2[i] / 2;
  }
  return {
    total3mg: (total3mg * weeks).toFixed(1),
    total2mg: (total2mg * weeks).toFixed(1),
  };
}

document.getElementById("calcBtn").addEventListener("click", () => {
  const inr = parseFloat(document.getElementById("inr").value);
  const weeklyDose = parseFloat(document.getElementById("weeklyDose").value);
  const days = parseInt(document.getElementById("days").value, 10);
  const pillChoice = document.querySelector('input[name="pills"]:checked').value;
  const bleed = document.querySelector('input[name="bleed"]:checked').value;

  if (isNaN(inr) || isNaN(weeklyDose) || isNaN(days)) {
    alert("กรุณากรอกข้อมูลให้ถูกต้อง");
    return;
  }

  let adj = { minPct: 0, maxPct: 0, avgPct: 0, note: "" };
  if (inr < 1.5) {
    adj.minPct = 0.1;
    adj.maxPct = 0.2;
    adj.avgPct = 0.15;
    adj.note = "เพิ่มขนาดยารายสัปดาห์ 10–20%";
  } else if (inr >= 1.5 && inr <= 1.9) {
    adj.minPct = 0.05;
    adj.maxPct = 0.1;
    adj.avgPct = 0.075;
    adj.note = "เพิ่ม 5–10% หรือพิจารณาไม่ปรับ แต่ติดตาม INR บ่อยขึ้น";
  } else if (inr >= 2.0 && inr <= 3.0) {
    adj.minPct = 0;
    adj.maxPct = 0;
    adj.avgPct = 0;
    adj.note = "ไม่ต้องปรับยา";
  } else if (inr >= 3.1 && inr <= 3.9) {
    adj.minPct = -0.1;
    adj.maxPct = -0.05;
    adj.avgPct = -0.075;
    adj.note = "ลดขนาดยารายสัปดาห์ 5–10%";
  } else if (inr > 3.9 && inr < 5.0 && bleed === "no") {
    adj.minPct = -0.1;
    adj.maxPct = -0.1;
    adj.avgPct = -0.1;
    adj.note = "หยุดยา 1 วัน แล้วกลับมาเริ่มด้วยขนาดที่ลดลง 10%";
  } else if (inr >= 5.0 && inr <= 9.0 && bleed === "no") {
    adj.minPct = -0.2;
    adj.maxPct = -0.2;
    adj.avgPct = -0.2;
    adj.note =
      "หยุดยา 2 วัน แล้วกลับมาเริ่มด้วยขนาดที่ลดลง 20% — พิจารณาให้ Vit K1 1–2.5 mg ถ้ามีความเสี่ยงเลือดออก";
  } else if (inr > 9.0 && bleed === "no") {
    adj.minPct = null;
    adj.maxPct = null;
    adj.avgPct = null;
    adj.note =
      "INR > 9.0: หยุดยา ให้ Vit K1 2.5–5 mg รับประทาน และติดตาม INR อย่างใกล้ชิด — ปรึกษาแพทย์/เภสัชกรเพื่อการปรับยา";
  }
  if (bleed === "yes") {
    adj.note =
      "พบภาวะเลือดออก: ให้ Vit K1 และพิจารณาการรักษาเฉียบพลันตามข้อแนะนำทางการแพทย์";
  }

  let newRange = {};
  if (adj.minPct === null) {
    newRange.note =
      "ไม่แนะนำให้คำนวณขนาดยาอัตโนมัติสำหรับ INR > 9.0 — ให้ผู้เชี่ยวชาญประเมิน";
  } else {
    const min = weeklyDose * (1 + adj.minPct);
    const max = weeklyDose * (1 + adj.maxPct);
    const avg = weeklyDose * (1 + adj.avgPct);
    newRange = {
      min: roundHalf(min * 2) / 2,
      max: roundHalf(max * 2) / 2,
      avg: roundHalf(avg * 2) / 2,
    };
  }

  const resDiv = document.getElementById("results");
  let html = `<div class="card">`;
  html += `<p><strong>คำแนะนำ:</strong> INR = ${inr.toFixed(2)} — ${
    adj.note
  }</p>`;
  if (newRange.note) {
    html += `<p class="note">${newRange.note}</p>`;
  } else {
    html += `<p>ขนาดยาใหม่ต่อสัปดาห์ (mg): <strong>${newRange.min.toFixed(
      1
    )} — ${newRange.max.toFixed(1)}</strong> (เฉลี่ย ${newRange.avg.toFixed(
      1
    )} mg)</p>`;
    html += `<p class="small">(คำนวณเป็นช่วง: min = ${Math.round(
      adj.minPct * 100
    )}%, max = ${Math.round(adj.maxPct * 100)}%, avg = ${Math.round(
    adj.avgPct * 100
  )}%)</p>`;
  }
  html += `</div>`;
  resDiv.innerHTML = html;
  resDiv.style.display = "block";

  const tables = document.getElementById("tables");
  const plansDiv = document.getElementById("plans");
  plansDiv.innerHTML = "";

  if (newRange.min !== undefined) {
    const targets = [
      { k: "ต่ำสุด", val: newRange.min },
      { k: "เฉลี่ย", val: newRange.avg },
      { k: "สูงสุด", val: newRange.max },
    ];
    for (const t of targets) {
      let best;
      if (pillChoice === "3") {
        const target = t.val;
        const h3 = Math.round(target / 1.5);
        best = { h3: h3, h2: 0, total: h3 * 1.5 };
      } else if (pillChoice === "2") {
        const target = t.val;
        const h2 = Math.round(target / 1.0);
        best = { h3: 0, h2: h2, total: h2 * 1.0 };
      } else {
        best = findBestCombo(t.val);
      }
      plansDiv.innerHTML += buildPlanHTML(t.k, best, days);

      // แสดงสรุปจำนวนเม็ดตามจำนวนวันนัด
      const perDay3 = distributeEvenly(best.h3, 7);
      const perDay2 = distributeEvenly(best.h2, 7);
      const totals = calculateTotalPills(perDay3, perDay2, days);

      plansDiv.innerHTML += `
        <div style="margin-bottom:20px; background:#E3F2FD; padding:8px; border-radius:8px;">
          <strong>สรุปจำนวนเม็ดที่ต้องจ่าย (${t.k}):</strong><br/>
          เม็ด 3 mg: <strong>${totals.total3mg}</strong> เม็ด<br/>
          เม็ด 2 mg: <strong>${totals.total2mg}</strong> เม็ด
        </div>`;
    }
    tables.style.display = "block";
  } else {
    plansDiv.innerHTML = `<div class="note">${newRange.note}</div>`;
    tables.style.display = "block";
  }
};
