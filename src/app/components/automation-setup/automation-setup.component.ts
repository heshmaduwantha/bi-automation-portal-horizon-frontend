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
  tables: string[] = [];
  filteredTables: string[] = [];
  tableSearchTerm = '';
  selectedTable = '';
  isCustomDax = false;
  customDaxQuery = '';
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
    this.fetchTables(suggestion.datasetId);
  }

  fetchTables(datasetId: string): void {
    this.loading = true;
    this.powerbiService.getDatasetTables(datasetId).subscribe({
      next: (tables) => {
        this.tables = tables;
        this.filteredTables = tables;
        this.loading = false;
        this.step = 2; // Move to table selection step
      },
      error: (err) => {
        // Fallback: If tables fetch fails, we still go to step 2 but with empty list
        this.tables = [];
        this.loading = false;
        this.step = 2;
        this.messageService.add({ severity: 'warn', summary: 'Limited Access', detail: 'Could not fetch tables automatically. Please enter table name manually.' });
      }
    });
  }

  onTableSearch(term: string): void {
    if (!term) {
      this.filteredTables = this.tables;
      return;
    }
    const t = term.toLowerCase();
    this.filteredTables = this.tables.filter(tab => tab.toLowerCase().includes(t));
  }

  onSelectTable(): void {
    if (this.isCustomDax) {
      if (!this.customDaxQuery || !this.selectedReport) return;
      this.fetchCustomSchema(this.selectedReport.datasetId, this.customDaxQuery);
    } else {
      if (!this.selectedTable || !this.selectedReport) return;
      this.fetchSchema(this.selectedReport.datasetId, this.selectedTable);
    }
  }

  fetchCustomSchema(datasetId: string, dax: string): void {
    this.loading = true;
    // We'll use the execute-query endpoint to get the schema of the custom DAX
    this.powerbiService.executeQuery(datasetId, `EVALUATE TOPN(1, ${dax})`).subscribe({
      next: (result) => {
        if (result.results?.[0]?.tables?.[0]?.rows?.length > 0) {
          const firstRow = result.results[0].tables[0].rows[0];
          this.columns = Object.keys(firstRow).map(key => ({
            name: key,
            dataType: 'String',
            sanitizedName: key.toLowerCase().replace(/[^a-z0-9]/g, '_')
          }));
          this.step = 3;
        } else {
          alert('No data returned from DAX query. Please check the query.');
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('DAX Schema error:', err);
        alert('Failed to validate DAX query. ' + (err.error?.message || err.message));
        this.loading = false;
      }
    });
  }

  fetchSchema(datasetId: string, tableName: string): void {
    this.loading = true;
    this.powerbiService.getDatasetSchema(datasetId, tableName).subscribe({
      next: (cols) => {
        this.columns = cols;
        // Fetch dataset info but don't block if it fails
        this.powerbiService.getDatasetById(datasetId).subscribe({
          next: (ds) => {
            this.datasetInfo = ds;
            this.loading = false;
            this.step = 3;
          },
          error: (err) => {
            console.error('Dataset info fetch failed', err);
            this.loading = false;
            this.step = 3; // Still proceed to step 3
          }
        });
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Schema Fetch Failed', detail: 'Could not retrieve columns for this table.' });
        this.loading = false;
      }
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

    // Duplicate check (Report + Table)
    const alreadyScheduled = this.existingTasks.some(t => 
      t.reportId === this.selectedReport?.id && 
      t.pbiTableName === this.selectedTable
    );
    
    if (alreadyScheduled) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Duplicate Schedule', 
        detail: `The table "${this.selectedTable}" in report "${this.selectedReport.name}" is already scheduled.` 
      });
      return;
    }

    const task = {
      reportId: this.selectedReport.id,
      reportName: this.selectedReport.name,
      datasetId: this.selectedReport.datasetId,
      tableName: this.isCustomDax ? `Custom_Query_${Date.now()}` : this.selectedTable,
      pbiTableName: this.isCustomDax ? `EVALUATE ${this.customDaxQuery}` : this.selectedTable,
      cronTime: this.cronTime,
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
