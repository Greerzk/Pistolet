import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../services/admin';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink], 
  templateUrl: './dashboard.html',
})
export class AdminDashboardComponent implements OnInit {
  insumosCriticos: any[] = [];
  cargando = true;

  constructor(
    private adminService: AdminService, 
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.obtenerReporte();
  }

  obtenerReporte() {
    this.cargando = true;
    this.adminService.getInventarioCritico().subscribe({
      next: (data) => {
        this.insumosCriticos = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar la vista:', err);
        this.cargando = false;
      }
    });
  }

  exportarExcel() {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.insumosCriticos);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Insumos Críticos');
    XLSX.writeFile(wb, 'Reporte_Insumos_Pistolet.xlsx');
  }
}