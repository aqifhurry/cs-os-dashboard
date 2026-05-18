// ─────────────────────────────────────────────────────────────
// Aturan shift:
//   Shift 1 : 09:00 – 16:00
//   Shift 2 : 16:00 – 23:00
//   Di luar jam shift (23:01 – 08:59): SLA mulai dari 09:00 hari berikutnya
//
// SLA target: 15 menit
// Berlaku setiap hari termasuk Minggu
// ─────────────────────────────────────────────────────────────

export const SLA_MINUTES = 15;

// Konversi "HH:MM" ke total menit dari 00:00
export const toMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

// Format menit ke string "X jam Y mnt" atau "Y mnt"
export const fmtMinutes = (mins) => {
  if (mins === null || mins === undefined) return "-";
  const absMin = Math.abs(mins);
  if (absMin >= 60) {
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    return `${h}j ${m}m`;
  }
  return `${absMin} mnt`;
};

// ── Tentukan shift berdasarkan waktu ──────────────────────────
// Return: "shift1" | "shift2" | "off"
export const getShift = (timeStr) => {
  const mins = toMinutes(timeStr);
  if (mins === null) return "off";
  if (mins >= 9 * 60  && mins < 16 * 60) return "shift1"; // 09:00–15:59
  if (mins >= 16 * 60 && mins < 23 * 60) return "shift2"; // 16:00–22:59
  return "off"; // 23:00–08:59
};

// ── Hitung SLA start time ─────────────────────────────────────
// Kalau inquiry masuk di luar jam shift, SLA mulai jam 09:00 hari berikutnya
// Return: { slaStartTime: "HH:MM", isNextDay: boolean, shiftLabel: string }
export const getSLAStart = (inquiryTime) => {
  const shift = getShift(inquiryTime);
  if (shift === "shift1") {
    return { slaStartTime: inquiryTime, isNextDay: false, shiftLabel: "Shift 1 (09.00-16.00)" };
  }
  if (shift === "shift2") {
    return { slaStartTime: inquiryTime, isNextDay: false, shiftLabel: "Shift 2 (16.00-23.00)" };
  }
  // off hours → SLA mulai jam 09:00 hari berikutnya
  return { slaStartTime: "09:00", isNextDay: true, shiftLabel: "Next Day Shift 1 (09.00)" };
};

// ── Hitung actual RT (menit) ──────────────────────────────────
// Actual = selisih inquiry → resp1, tanpa mempedulikan shift
// Bisa lintas hari jika resp1 < inquiry (misal inquiry 23:01, resp1 09:05)
export const calcActualRT = (inquiryTime, resp1Time, resp1NextDay = false) => {
  const inqMin  = toMinutes(inquiryTime);
  const respMin = toMinutes(resp1Time);
  if (inqMin === null || respMin === null) return null;

  if (resp1NextDay || respMin < inqMin) {
    // Lintas hari: sisa menit sampai tengah malam + menit di hari berikutnya
    return (24 * 60 - inqMin) + respMin;
  }
  return respMin - inqMin;
};

// ── Hitung SLA RT (menit) ─────────────────────────────────────
// SLA RT = selisih dari slaStartTime → resp1Time
// Kalau inquiry di luar jam shift: SLA start = 09:00 esok hari
export const calcSLART = (inquiryTime, resp1Time) => {
  const { slaStartTime, isNextDay } = getSLAStart(inquiryTime);
  const slaMin  = toMinutes(slaStartTime);
  const respMin = toMinutes(resp1Time);
  if (slaMin === null || respMin === null) return null;

  if (isNextDay) {
    // resp1 di hari berikutnya setelah 09:00
    // SLA RT = resp1 - 09:00 (sama hari karena sudah next day)
    if (respMin < slaMin) {
      // Respon sebelum jam 09:00 — tidak valid, tapi handle dengan 0
      return 0;
    }
    return respMin - slaMin;
  }
  return respMin - slaMin;
};

// ── Status SLA ────────────────────────────────────────────────
// Return: "PASS" | "FAIL" | "OFF_HOURS"
export const getSLAStatus = (inquiryTime, resp1Time) => {
  if (!resp1Time) return null;
  const shift = getShift(inquiryTime);
  const slaRT = calcSLART(inquiryTime, resp1Time);
  if (slaRT === null) return null;

  if (shift === "off") return slaRT <= SLA_MINUTES ? "PASS_OH" : "FAIL_OH";
  return slaRT <= SLA_MINUTES ? "PASS" : "FAIL";
};

// Label & warna per status
export const SLA_BADGE = {
  PASS:    { label: "PASS",        bg: "#DCFCE7", text: "#166534" },
  FAIL:    { label: "FAIL",        bg: "#FEE2E2", text: "#B91C1C" },
  PASS_OH: { label: "PASS (OOH)",  bg: "#D1FAE5", text: "#065F46" }, // OOH = out of hours
  FAIL_OH: { label: "FAIL (OOH)",  bg: "#FEE2E2", text: "#991B1B" },
};
