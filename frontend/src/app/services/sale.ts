// =====================================================================
//  PISTOLET · Ventas = pedidos pagados
//  En el esquema unificado las ventas son PEDIDOS, por lo que este
//  servicio consume /api/pedidos y los normaliza a la forma que usa la
//  pantalla de ventas (folio, fecha, total, estado, detalle).
// =====================================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SaleService {
  private apiUrl = environment.apiUrl + '/pedidos';

  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map((rows) =>
        (rows ?? []).map((p) => ({
          id: p.id,
          folio: p.folio,
          fecha: p.creado_en,
          total: p.total,
          estado: p.estado,
          cliente: p.cliente,
        }))
      )
    );
  }

  getDetails(id: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((p) =>
        (p?.lineas ?? []).map((l: any) => ({
          producto: l.nombre,
          cantidad: l.cantidad,
          precio: l.precio_unitario,
          subtotal: l.subtotal,
        }))
      )
    );
  }

  cancel(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/cancelar`, {});
  }
}
