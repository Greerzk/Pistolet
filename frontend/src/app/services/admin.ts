// =====================================================================
//  PISTOLET · Reportes del panel admin
//  GET /api/reports/inventory -> insumos con stock <= stock_minimo
//  Se normaliza la respuesta a las llaves que usa el dashboard.
// =====================================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl + '/reports';

  constructor(private http: HttpClient) { }

  getInventarioCritico(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/inventory`).pipe(
      map((rows) =>
        (rows ?? []).map((r) => ({
          ingrediente: r.nombre,
          stock_actual: r.stock,
          unidad_medida: r.unidad,
          proveedor: r.proveedor,
        }))
      )
    );
  }
}
