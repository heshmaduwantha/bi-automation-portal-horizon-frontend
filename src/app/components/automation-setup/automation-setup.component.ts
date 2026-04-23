import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PowerbiService, PowerBIReport, PowerBISchemaColumn, PowerBIDataset } from '../../services/powerbi.service';
import { AutomationApiService } from '../../services/automation-api.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-automation-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './automation-setup.component.html',
  styleUrl: './automation-setup.component.css'
})
export class AutomationSetupComponent implements OnInit {
  // Step 1: Selection
  reports: PowerBIReport[] = [];
  suggestions: any[] = [];
  searchTerm = '';
  selectedReport: PowerBIReport | null = null;
  
  // Step 2: Configuration
  columns: PowerBISchemaColumn[] = [];
  datasetInfo: PowerBIDataset | null = null;
  selectedPKs: string[] = [];
  cronTime = '0 0 * * *'; // Default: Daily at midnight
  
  loading = false;
  step = 1;

  existingTasks: any[] = [];

  constructor(
    private powerbiService: PowerbiService,
    private automationApi: AutomationApiService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loading = true;
    
    // Fetch both reports and existing schedules
    this.powerbiService.getReports().subscribe({
      next: (data) => {
        this.reports = data;
        this.automationApi.getTasks().subscribe(tasks => {
          this.existingTasks = tasks;
          this.loading = false;
        });
      },
      error: () => this.loading = false
    });
  }

  onSearch(term: string): void {
    if (term.length < 2) {
      this.suggestions = [];
      return;
    }

    this.powerbiService.searchCache(term).subscribe(data => {
      this.suggestions = data;
    });
  }

  onSelectSuggestion(suggestion: any): void {
    this.searchTerm = suggestion.name;
    this.suggestions = [];
    this.selectedReport = {
      id: suggestion.id,
      name: suggestion.name,
      datasetId: suggestion.datasetId,
      reportType: 'PowerBIReport',
      format: 'Original',
      webUrl: '',
      embedUrl: ''
    };
    this.fetchSchema(suggestion.datasetId);
  }

  onSelectReport(reportId: string): void {
    const report = this.reports.find(r => r.id === reportId);
    if (report) {
      this.selectedReport = report;
      this.fetchSchema(report.datasetId);
    }
  }

  fetchSchema(datasetId: string): void {
    this.loading = true;
    // Fetch both schema and dataset info (for refresh time)
    this.powerbiService.getDatasetSchema(datasetId).subscribe(cols => {
      this.columns = cols;
      this.powerbiService.getDatasetById(datasetId).subscribe(ds => {
        this.datasetInfo = ds;
        this.loading = false;
        this.step = 2;
      });
    });
  }

  togglePK(sanitizedName: string): void {
    const index = this.selectedPKs.indexOf(sanitizedName);
    if (index > -1) {
      this.selectedPKs.splice(index, 1);
    } else {
      this.selectedPKs.push(sanitizedName);
    }
  }

  saveSchedule(): void {
    if (!this.selectedReport || this.selectedPKs.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Missing Configuration', detail: 'Please select at least one Primary Key.' });
      return;
    }

    // Duplicate check
    const alreadyScheduled = this.existingTasks.some(t => t.reportId === this.selectedReport?.id);
    if (alreadyScheduled) {
      this.messageService.add({ severity: 'error', summary: 'Duplicate Schedule', detail: `The report "${this.selectedReport.name}" is already scheduled.` });
      return;
    }

    const task = {
      reportName: this.selectedReport.name,
      reportId: this.selectedReport.id,
      datasetId: this.selectedReport.datasetId,
      workspaceId: 'cda4f662-6824-4e18-9cc3-ac5c56dcb8db', // Using mock workspace
      cronExpression: this.cronTime,
      primaryKeys: this.selectedPKs
    };

    this.loading = true;
    this.automationApi.scheduleTask(task).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Scheduled', detail: 'Automation task created successfully.' });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Creation Failed', detail: 'Failed to schedule. Check console.' });
        this.loading = false;
        console.error(err);
      }
    });
  }
}
