import { FONNTE_TOKEN } from "../constants";

export const PIC_PHONE = {
  Aqif:   "6281234567890", 
  Vira:   "6281234567891", 
  Musa:   "6281234567892", 
  Farah:  "6281234567893", 
  Zafira: "6281234567894",
  Khansa: "6281234567895", 
  Naufal: "6281234567896", 
};

// ─────────────────────────────────────────────────────────────
// Core sendeR
// ─────────────────────────────────────────────────────────────
async function sendWA(phone, message) {
  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method:  "POST",
      headers: {
        "Authorization": FONNTE_TOKEN,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        target:      phone,
        message,
        countryCode: "62",
      }),
    });

    const json = await res.json();
    console.log(`[WA] Response dari Fonnte:`, json);
    return json;

  } catch (err) {
    console.error("[WA] Fetch error:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Helper: validasi nomor
// ─────────────────────────────────────────────────────────────
function getPhone(pic) {
  const phone = PIC_PHONE[pic];
  if (!phone) {
    console.warn(`[WA] PIC "${pic}" tidak ada di PIC_PHONE.`);
    return null;
  }

  if (phone === "6281234567890" ||
      phone === "6281234567891" ||
      phone === "6281234567892" ||
      phone === "6281234567893" ||
      phone === "6281234567894" ||
      phone === "6281234567895" ||
      phone === "6281234567896") {
    console.warn(`[WA] Nomor HP "${pic}" belum diubah dari placeholder. Ganti di sendWA.js!`);
    return null;
  }
  return phone;
}

// ─────────────────────────────────────────────────────────────
// 1. Notifikasi tugas baru, Dipanggil saat SPV buat tugas (WhatShouldIDoToday.jsx)
// ─────────────────────────────────────────────────────────────
export async function sendTaskNotification({ pic, judul, deadline, assignedBy }) {
  const phone = getPhone(pic);
  if (!phone) return;

  const deadlineFmt = deadline
    ? new Date(deadline + "T00:00:00").toLocaleDateString("id-ID", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric"
      })
    : "Tidak ada deadline";

  const message =
    `Halo *${pic}*! 👋\n\n` +
    `Kamu mendapat tugas baru dari *${assignedBy}*:\n\n` +
    `📋 *${judul}*\n` +
    `📅 Deadline: *${deadlineFmt}*\n\n` +
    `Cek CS Dashboard untuk detail lengkap & update statusnya ya!\n` +
    `https://cs-os-dashboard.web.app`;

  const json = await sendWA(phone, message);
  if (json?.status) {
    console.log(`[WA] ✓ Notif tugas baru → ${pic} (${phone})`);
  } else {
    console.warn(`[WA] ✗ Gagal kirim ke ${pic}:`, json);
  }
}

// ─────────────────────────────────────────────────────────────
// 2. Reminder H-1 sebelum deadline
//    Dipanggil saat app load di WhatShouldIDoToday & CSTodoPage
// ─────────────────────────────────────────────────────────────
export async function sendDeadlineReminders(tasks) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Cegah kirim ulang dalam hari yang sama
  const lastSent = localStorage.getItem("wa_reminder_sent_date");
  if (lastSent === today) {
    console.log("[WA] Reminder H-1 sudah dikirim hari ini — skip.");
    return;
  }

  // Hitung besok
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const dueTomorrow = tasks.filter(t =>
    t.deadline === tomorrowStr &&
    t.status   !== "Done"      &&
    !t.deletedAt               &&
    t.pic
  );

  if (dueTomorrow.length === 0) {
    console.log("[WA] Tidak ada tugas deadline besok.");
    localStorage.setItem("wa_reminder_sent_date", today); // tandai sudah dicek
    return;
  }

  console.log(`[WA] Mengirim ${dueTomorrow.length} reminder H-1...`);

  for (const task of dueTomorrow) {
    const phone = getPhone(task.pic);
    if (!phone) continue;

    const deadlineFmt = new Date(task.deadline + "T00:00:00").toLocaleDateString("id-ID", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric"
    });

    const statusLabel =
      task.status === "In Progress" ? `In Progress (${task.progressPct ?? 0}%)`
      : task.status === "Blocker"   ? "Blocker — segera resolve!"
      : "Not Started — belum dimulai!";

    const message =
      `⚠️ *REMINDER DEADLINE H-1* ⚠️\n\n` +
      `Halo *${task.pic}*! Tugas kamu deadline *besok*:\n\n` +
      `📋 *${task.judul}*\n` +
      `📅 ${deadlineFmt}\n` +
      `📊 Status: *${statusLabel}*\n\n` +
      `Segera selesaikan atau update statusnya ya di CS Dashboard!\n` +
      `https://cs-os-dashboard.web.app`;

    const json = await sendWA(phone, message);
    if (json?.status) {
      console.log(`[WA] ✓ Reminder H-1 → ${task.pic} — "${task.judul}"`);
    } else {
      console.warn(`[WA] ✗ Gagal kirim reminder → ${task.pic}:`, json);
    }

    // Delay 1.5 detik antar pesan agar tidak kena rate-limit Fonnte
    await new Promise(r => setTimeout(r, 1500));
  }

  // Tandai sudah kirim hari ini
  localStorage.setItem("wa_reminder_sent_date", today);
  console.log("[WA] ✓ Semua reminder H-1 selesai dikirim.");
}
