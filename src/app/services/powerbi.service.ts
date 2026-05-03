import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PowerBIReport {
  id: string;
  name: string;
  reportType: string;
  format: string;
  datasetId: string;
  webUrl: string;
  embedUrl: string;
}

export interface PowerBIDataset {
  id: string;
  name: string;
  lastRefreshTime?: string;
}

export interface PowerBISchemaColumn {
  name: string;
  dataType: string;
  sanitizedName: string;
}

@Injectable({
  providedIn: 'root'
})
export class PowerbiService {
  private apiUrl = 'http://localhost:4020/powerbi';

  constructor(private http: HttpClient) {}

  getReports(page: number = 1, limit: number = 10, search: string = ''): Observable<any> {
    const params = { page: page.toString(), limit: limit.toString(), search };
    return this.http.get<any>(`${this.apiUrl}/reports`, { params });
  }

  getDatasetById(datasetId: string): Observable<PowerBIDataset> {
    return this.http.get<PowerBIDataset>(`${this.apiUrl}/datasets/${datasetId}`);
  }

  getDatasetTables(datasetId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/datasets/${datasetId}/tables`);
  }

  getDatasetSchema(datasetId: string, tableName?: string): Observable<PowerBISchemaColumn[]> {
    const url = `${this.apiUrl}/datasets/${datasetId}/schema${tableName ? '?tableName=' + encodeURIComponent(tableName) : ''}`;
    return this.http.get<PowerBISchemaColumn[]>(url);
  }

  searchCache(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/search-cache?q=${query}`);
  }

  triggerRefresh(datasetId: string, groupId?: string): Observable<any> {
    const url = `${this.apiUrl}/datasets/${datasetId}/refresh${groupId ? '?groupId=' + groupId : ''}`;
    return this.http.post(url, {});
  }
}
