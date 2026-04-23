import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AutomationTask {
  id?: number;
  reportName: string;
  reportId: string;
  workspaceId: string;
  datasetId: string;
  cronExpression: string;
  primaryKeys: string[];
  status?: string;
  lastRunTime?: string;
  lastRunRecordCount?: number;
  lastErrorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AutomationApiService {
  private apiUrl = 'http://localhost:4020/automation';

  constructor(private http: HttpClient) {}

  scheduleTask(task: Partial<AutomationTask>): Observable<AutomationTask> {
    return this.http.post<AutomationTask>(`${this.apiUrl}/schedule`, task);
  }

  getTasks(): Observable<AutomationTask[]> {
    return this.http.get<AutomationTask[]>(`${this.apiUrl}/tasks`);
  }

  deleteTask(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tasks/${id}`);
  }

  runTaskManually(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/tasks/${id}/run`, {});
  }
}
