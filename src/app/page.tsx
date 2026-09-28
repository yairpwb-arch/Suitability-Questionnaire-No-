"use client";

import { useState, type FormEvent } from "react";
import styles from "./page.module.css";

const DURATION_OPTIONS = [
  "מתחת ל-3 חודשים",
  "חצי שנה",
  "שנה ומעלה",
  "כל החיים...",
];

const REASON_OPTIONS = [
  "רוצה להרגיש טוב עם עצמי במראה",
  "אני דואג לבריאות שלי",
  "המשקל מקשה עלי ביום יום",
  "כל התשובות נכונות",
];

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [duration, setDuration] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, duration, reason }),
      });
      if (!res.ok) throw new Error("submit failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.frame}>
        <div className={styles.orangePoster} aria-hidden />
        <div className={styles.card}>
        <header className={styles.header}>
          <span className={styles.logo}>
            היאירים <span className={styles.logoDivider}>|</span> חטוב בלי
            תפריט
          </span>
        </header>

        <main className={styles.page}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.hero}>
              <h1 className={styles.title}>
                לקביעת שיחת התאמה לתוכנית
                <br />
                וקבלת ההתחייבות! <span aria-hidden>👇</span>
              </h1>
              <p className={styles.subtitle}>
                הטופס מיועד לגברים ונשים ששנמאס להם מתפריטים ורוצים לשמוע על
                תוכנית הליווי שלנו.
              </p>
            </div>

            <div className={styles.fieldGroup}>
              <input
                className={styles.input}
                type="text"
                name="name"
                placeholder="איך קוראים לך?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
              <input
                className={styles.input}
                type="tel"
                name="phone"
                placeholder="מספר טלפון"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="numeric"
                pattern="0\d{1,2}[\s\-]?\d{7}"
                title="מספר טלפון ישראלי תקין, לדוגמה: 0501234567"
                required
              />
            </div>

            <div
              className={styles.question}
              role="radiogroup"
              aria-labelledby="duration-question"
            >
              <p id="duration-question" className={styles.questionTitle}>
                כמה זמן ניסית לשנות את הגוף שלך?
              </p>
              <div className={styles.options}>
                {DURATION_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className={`${styles.optionBox} ${
                      duration === option ? styles.optionBoxSelected : ""
                    }`}
                  >
                    <input
                      className={styles.radioInput}
                      type="radio"
                      name="duration"
                      value={option}
                      checked={duration === option}
                      onChange={() => setDuration(option)}
                      required
                    />
                    <span className={styles.radioVisual} aria-hidden />
                    <span className={styles.optionText}>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div
              className={styles.question}
              role="radiogroup"
              aria-labelledby="reason-question"
            >
              <p id="reason-question" className={styles.questionTitle}>
                שאלה אחרונה! למה חשוב לך לעשות שינוי עכשיו?
              </p>
              <div className={styles.options}>
                {REASON_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className={`${styles.optionBox} ${
                      reason === option ? styles.optionBoxSelected : ""
                    }`}
                  >
                    <input
                      className={styles.radioInput}
                      type="radio"
                      name="reason"
                      value={option}
                      checked={reason === option}
                      onChange={() => setReason(option)}
                      required
                    />
                    <span className={styles.radioVisual} aria-hidden />
                    <span className={styles.optionText}>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className={styles.checkboxRow}>
              <input
                className={styles.checkboxInput}
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                required
              />
              <span className={styles.checkboxText}>
                אני מבין/ה שהתוכנית בתשלום וההטבה היא התחייבות לתוצאות או
                החזר כספי מלא
              </span>
            </label>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "שולח..." : "אני רוצה שיחזרו אלי!"}
            </button>

            {status === "success" && (
              <p className={styles.formStatusSuccess}>
                תודה! קיבלנו את הפרטים ונחזור אליך בקרוב.
              </p>
            )}
            {status === "error" && (
              <p className={styles.formStatusError}>
                משהו השתבש בשליחה, נסה/י שוב או צור/י קשר ישירות.
              </p>
            )}
          </form>
        </main>
        </div>
      </div>
    </div>
  );
}
