/**
 * Hashes a string password using SHA-256 with Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'pulse_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Basic fallback string hash if crypto.subtle is unavailable
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
}

/**
 * Calculates BMI based on height in cm and weight in kg
 */
export function calculateBMI(heightCm: number, weightKg: number): { bmi: number; category: string; color: string } {
  if (!heightCm || !weightKg || heightCm <= 0) return { bmi: 0, category: 'Unknown', color: 'text-amber-800/60 font-medium' };
  const heightM = heightCm / 100;
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  
  if (bmi < 18.5) return { bmi, category: 'Underweight', color: 'text-amber-400 font-bold' };
  if (bmi < 25.0) return { bmi, category: 'Normal weight', color: 'text-amber-300 font-bold' };
  if (bmi < 30.0) return { bmi, category: 'Overweight', color: 'text-amber-500 font-bold' };
  return { bmi, category: 'Obesity', color: 'text-rose-400 font-bold' };
}

/**
 * Calculates exact age in years from a birthday string (YYYY-MM-DD)
 */
export function calculateAgeFromBirthday(birthdayStr?: string): number {
  if (!birthdayStr) return 25;
  const birthDate = new Date(birthdayStr);
  if (isNaN(birthDate.getTime())) return 25;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

/**
 * Helper to calculate sleep duration in hours from start time (HH:mm) and end time (HH:mm)
 */
export function calculateSleepDuration(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;
  
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  // If end time is earlier in the day than start time, assume it spanned past midnight
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  const diffMinutes = endMinutes - startMinutes;
  return parseFloat((diffMinutes / 60).toFixed(1));
}
