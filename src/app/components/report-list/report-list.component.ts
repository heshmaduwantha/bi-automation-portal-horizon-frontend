import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PowerbiService, PowerBIReport } from '../../services/powerbi.service';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonModule, InputTextModule, FormsModule],
  templateUrl: './report-list.component.html',
  styleUrl: './report-list.component.css'
})
export class ReportListComponent implements OnInit {
  reports: PowerBIReport[] = [];
  loading = true;
  error: string | null = null;
  
  // Pagination & Search
  currentPage = 1;
  pageSize = 10;
  totalReports = 0;
  searchQuery = '';
  totalPages = 0;

  constructor(
    private powerbiService: PowerbiService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.loading = true;
    this.powerbiService.getReports(this.currentPage, this.pageSize, this.searchQuery).subscribe({
      next: (res) => {
        this.reports = res.data;
        this.totalReports = res.total;
        this.totalPages = res.lastPage;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load reports. Make sure the backend is running.';
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Connection Error', detail: 'Could not fetch Power BI reports.' });
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1; // Reset to first page on search
    this.loadReports();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadReports();
    }
  }

  onRefresh(datasetId: string): void {
    this.powerbiService.triggerRefresh(datasetId).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'success', summary: 'Refresh Triggered', detail: res.message });
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Refresh Failed', detail: 'API call unsuccessful.' });
      }
    });
  }

  openReport(url: string): void {
    window.open(url, '_blank');
  }
}
