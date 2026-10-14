// =====================================================================
//  PISTOLET · Productos (CRUD del panel admin)
//  Mismo backend que la app móvil. Las rutas de escritura requieren rol
//  empleado/admin; el interceptor agrega el token automáticamente.
// =====================================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = environment.apiUrl + '/productos';

  constructor(private http: HttpClient) {}

  // GET /api/productos -> arreglo `data`
  getAll(): Observable<any[]> {
    return this.http.get<any>(this.apiUrl).pipe(map((res) => res?.data ?? res ?? []));
  }

  // GET /api/categorias -> lista para el <select> del formulario
  getCategorias(): Observable<any[]> {
    return this.http.get<any[]>(environment.apiUrl + '/categorias');
  }

  create(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  update(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, formData);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
