import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cronHumanize',
  standalone: true
})
export class CronHumanizePipe implements PipeTransform {
  transform(cron: string | undefined): string {
    if (!cron) return 'No schedule set';
    
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5) return cron;

    const [min, hour, dom, month, dow] = parts;
    
    // Format time to 12h format for better readability
    const hh = parseInt(hour);
    const mm = min.padStart(2, '0');
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const displayHour = hh % 12 || 12;
    const time = `${displayHour}:${mm} ${ampm}`;
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Case: Weekdays (1-5)
    if (dow === '1-5' || dow === '1,2,3,4,5') {
      return `Weekdays|at ${time}`;
    }

    // Case: Weekly
    if (dow !== '*' && dom === '*') {
      const dayName = days[parseInt(dow)] || dow;
      return `Every ${dayName}|at ${time}`;
    }

    // Case: Monthly
    if (dom !== '*' && dom !== '?') {
      return `Monthly on the ${dom}${this.getOrdinal(parseInt(dom))}|at ${time}`;
    }

    // Case: Daily
    if (dow === '*' && dom === '*') {
      return `Daily|at ${time}`;
    }

    return `Scheduled|at ${time}`;
  }

  private getOrdinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return (s[(v - 20) % 10] || s[v] || s[0]);
  }
}
