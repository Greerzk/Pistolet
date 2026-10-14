// =====================================================================
//  PISTOLET · Catálogo público de productos
//  GET /api/productos  ->  { data: [...], page, pageSize, total, totalPages }
//  El servicio devuelve directamente el arreglo `data`.
// =====================================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private apiUrl = environment.apiUrl + '/productos';

  constructor(private http: HttpClient) { }

  obtenerProductos(): Observable<any[]> {
    return this.http.get<any>(this.apiUrl).pipe(map((res) => res?.data ?? res ?? []));
  }

  obtenerProductoPorId(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}
