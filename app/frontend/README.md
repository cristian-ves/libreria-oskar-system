# Frontend - SPA React con Tailwind CSS y html5-qrcode

Módulo de cliente web SPA para **Librería Oskar**, desarrollado con **React (Vite)**, estilizado con **Tailwind CSS** e integrado con la biblioteca **html5-qrcode** para escaneo de códigos de barras / ISBN en tiempo real.

---

## 🎨 Características Implementadas

1. **Arquitectura de Componentes Modulares**:
   - `BarcodeScanner.jsx`: Control de flujo de video con `Html5Qrcode`, selección de dispositivos de video (cámara frontal/trasera), guía láser de enfoque y fallback manual.
   - `BookCard.jsx`: Tarjeta informativa enriquecida con portada externa, metadatos bibliográficos, stock anterior vs. actual y timestamp del movimiento atómico.
   - `Toast.jsx`: Notificaciones flotantes interactivas en esquina superior derecha con título del libro recuperado, badge de éxito y auto-cierre.
   - `LoadingSpinner.jsx`: Indicador visual overlay mientras se procesa la consulta con la API de Google Books y la transacción en PostgreSQL.
   - `Navbar.jsx`: Barra de navegación responsive con tabs funcionales y badge del operador activo.

2. **Sección 'Registrar Libro' (`RegistrarLibro.jsx`)**:
   - **Selección previa de Bodega**: Dropdown dinámico que consulta `/api/bodegas` para fijar el destino del inventario.
   - **Operador asignado**: Registro del `usuarioId` que efectúa el movimiento.
   - **Detección en tiempo real**: Al detectar un código de barras (ISBN-10 o ISBN-13), bloquea lecturas duplicadas e inmediatamente dispara un `fetch` `POST` a `/api/libros/escanear`.
   - **Feedback instantáneo**: Muestra el spinner de carga y genera la notificación flotante de éxito con el título del libro catalogado.
   - **Historial de sesión**: Registro cronológico de todos los ingresos realizados en la jornada de trabajo.

3. **Vistas Adicionales de la SPA**:
   - `Catalogo.jsx`: Catálogo reactivo con búsqueda en tiempo real con debounce (< 2s de respuesta).
   - `Inventario.jsx`: Resumen de bodegas y alertas de infraestructura.

---

## 🚀 Instrucciones de Ejecución

```bash
# Entrar a la carpeta del frontend
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en http://localhost:5173
npm run dev

# Compilar para producción (carpeta dist/)
npm run build
```
