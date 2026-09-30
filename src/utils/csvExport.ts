import type { DailyLog, Workout, WeightLog, MissedReason, User } from '../types';

export function exportUserDataToCSV(
  user: User,
  dailyLogs: DailyLog[],
  workouts: Workout[],
  weightLogs: WeightLog[],
  missedReasons: MissedReason[]
) {
  let csvContent = 'data:text/csv;charset=utf-8,';
  
  // Section 1: User Profile Header
  csvContent += `=== USER PROFILE ===\n`;
  csvContent += `Name,Height (cm),Current Weight (kg),Age,Gender,Created At\n`;
  csvContent += `"${user.name}",${user.height},${user.weight_current},${user.age},"${user.gender}","${user.created_at}"\n\n`;
  
  // Section 2: Daily Logs & Missed Reasons
  csvContent += `=== DAILY LOGS ===\n`;
  csvContent += `Date,Gym Completed,Steps (8k) Completed,Sleep (7-8h) Completed,Sleep Start,Sleep End,Sleep Duration (hrs),No Junk Food,Water Intake (ml),Missed Reasons\n`;
  
  const userDailyLogs = dailyLogs.filter(log => log.user_id === user.id).sort((a, b) => b.date.localeCompare(a.date));
  
  for (const log of userDailyLogs) {
    const reasons = missedReasons
      .filter(r => r.daily_log_id === log.id || (r.user_id === user.id && r.date === log.date))
      .map(r => `${r.goal_type.toUpperCase()}: ${r.reason_tag}${r.reason_text ? ' (' + r.reason_text + ')' : ''}`)
      .join('; ');
    
    csvContent += `"${log.date}",${log.gym_done ? 'YES' : 'NO'},${log.steps_done ? 'YES' : 'NO'},${log.sleep_done ? 'YES' : 'NO'},"${log.sleep_start || ''}","${log.sleep_end || ''}",${log.sleep_duration || 0},${log.junk_food_avoided ? 'YES' : 'NO'},${log.water_intake_ml || 0},"${reasons.replace(/"/g, '""')}"\n`;
  }
  
  csvContent += `\n=== WORKOUT LOGS ===\n`;
  csvContent += `Date,Exercise Name,Sets,Reps,Weight (kg),Duration (mins),Notes,Is Private\n`;
  
  const userWorkouts = workouts.filter(w => w.user_id === user.id).sort((a, b) => b.date.localeCompare(a.date));
  for (const w of userWorkouts) {
    csvContent += `"${w.date}","${w.exercise_name.replace(/"/g, '""')}",${w.sets},${w.reps},${w.weight || 0},${w.duration},"${(w.notes || '').replace(/"/g, '""')}",${w.is_private ? 'YES' : 'NO'}\n`;
  }

  csvContent += `\n=== WEIGHT HISTORY ===\n`;
  csvContent += `Date,Timestamp,Weight (kg)\n`;
  
  const userWeightLogs = weightLogs.filter(w => w.user_id === user.id).sort((a, b) => b.date.localeCompare(a.date));
  for (const w of userWeightLogs) {
    csvContent += `"${w.date}","${w.timestamp}",${w.weight}\n`;
  }

  // Trigger Download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${user.name.toLowerCase().replace(/\s+/g, '_')}_fitness_data.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
