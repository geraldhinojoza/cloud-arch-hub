# ☁️ Cloud Architecture Hub

> Recursos técnicos de referencia: CheatSheets, diseños de arquitectura multinube y patrones de solución para Azure.

![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen?style=flat-square&logo=github)
![Azure](https://img.shields.io/badge/Azure-Solution%20Architect-0078d4?style=flat-square&logo=microsoftazure)

---

## 📁 Estructura del repositorio

```
/
├── index.html              ← Página principal (modificar para agregar cards)
├── README.md
├── cheatsheets/
│   ├── CheatSheet_MongoDB.html
│   └── CheatSheet_XXXXX.html   ← Tus próximos cheatsheets aquí
└── cloud_designs/
    └── Design_XXXXX.html       ← Tus arquitecturas aquí
```

---

## 🚀 Levantar la web en GitHub Pages — Paso a paso

### 1. Crear el repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Nombre del repositorio: `cloud-arch-hub` (o el que prefieras)
3. Visibilidad: **Public** *(GitHub Pages gratuito requiere repo público, o cuenta Pro para privados)*
4. **NO** inicialices con README (ya tienes los archivos)
5. Clic en **Create repository**

---

### 2. Inicializar Git y subir los archivos

Abre una terminal en la carpeta del proyecto:

```bash
# Navegar a la carpeta del proyecto
cd "D:\trainings\branding_azure_solution_architect_expert"

# Inicializar Git
git init

# Agregar todos los archivos
git add .

# Primer commit
git commit -m "feat: initial CloudArch Hub setup"

# Conectar con GitHub (reemplaza con tu usuario y repo)
git remote add origin https://github.com/TU_USUARIO/cloud-arch-hub.git

# Subir al branch principal
git branch -M main
git push -u origin main
```

---

### 3. Activar GitHub Pages

1. En tu repositorio de GitHub, ve a **Settings** → **Pages**
2. En **Source**, selecciona: `Deploy from a branch`
3. Branch: `main` | Folder: `/ (root)`
4. Clic en **Save**
5. Espera 1-2 minutos → GitHub te dará la URL:
   ```
   https://TU_USUARIO.github.io/cloud-arch-hub/
   ```

---

### 4. Actualizar el link de GitHub en la navbar

Edita `index.html`, línea ~96, cambia:
```html
href="https://github.com/YOUR_USERNAME/YOUR_REPO"
```
por tu URL real:
```html
href="https://github.com/TU_USUARIO/cloud-arch-hub"
```

---

## 📋 Agregar un nuevo CheatSheet

### Paso 1 — Crear el archivo HTML

Copia el estilo de `CheatSheet_MongoDB.html` y guarda tu nuevo archivo en:
```
cheatsheets/CheatSheet_NOMBRE.html
```

### Paso 2 — Agregar la card en `index.html`

Busca el comentario `<!-- ── Placeholder: próximo cheatsheet ── -->` y **antes de él** agrega:

```html
<a href="cheatsheets/CheatSheet_NOMBRE.html"
   class="card card-cheat rounded-2xl p-6 flex flex-col gap-4 group no-underline data-card"
   data-type="cheatsheet" data-tags="kubernetes k8s containers azure">
    <div class="flex items-start justify-between">
        <div class="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl">
            ⚙️
        </div>
        <span class="tag tag-k8s">Orquestación</span>
    </div>
    <div>
        <h3 class="text-lg font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors mb-1">
            Kubernetes CheatSheet
        </h3>
        <p class="text-sm text-slate-400 leading-relaxed">
            Comandos kubectl, gestión de pods, deployments, services e ingress. Referencia para AKS.
        </p>
    </div>
    <div class="flex items-center gap-2 flex-wrap mt-auto pt-2">
        <span class="tag tag-k8s">AKS</span>
        <span class="tag tag-azure">Azure</span>
    </div>
    <div class="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-500">
        <span>v1.29 Reference</span>
        <span class="flex items-center gap-1 group-hover:text-cyan-400 transition-colors">
            Ver guía
            <svg class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
        </span>
    </div>
</a>
```

> **Clases de color disponibles para las cards:**
> | Estilo      | Clase hover card    | Color texto h3          |
> |-------------|---------------------|-------------------------|
> | Verde       | `card-cheat`        | `group-hover:text-emerald-400` |
> | Morado      | `card-design`       | `group-hover:text-indigo-400`  |
> | Azul (default) | *(ninguna extra)* | `group-hover:text-sky-400`     |

---

## 🏗️ Agregar un diseño de arquitectura

### Paso 1 — Guardar el archivo

```
cloud_designs/Design_NOMBRE.html
```

### Paso 2 — Agregar la card en `index.html`

Busca `<!-- ── Placeholder cards ── -->` en la sección `#designs` y **antes de él** agrega:

```html
<a href="cloud_designs/Design_NOMBRE.html"
   class="card card-design rounded-2xl p-6 flex flex-col gap-4 group no-underline data-card"
   data-type="design" data-tags="azure multicloud hub-spoke networking">
    <div class="flex items-start justify-between">
        <div class="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl">
            🌐
        </div>
        <span class="tag tag-multi">Multinube</span>
    </div>
    <div>
        <h3 class="text-lg font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors mb-1">
            Hub-Spoke Network Topology
        </h3>
        <p class="text-sm text-slate-400 leading-relaxed">
            Diseño de red hub-spoke en Azure con Virtual WAN, Firewall y conectividad híbrida on-premises.
        </p>
    </div>
    <div class="flex items-center gap-2 flex-wrap mt-auto pt-2">
        <span class="tag tag-azure">Azure</span>
        <span class="tag tag-multi">Hub-Spoke</span>
    </div>
    <div class="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-500">
        <span>Enterprise Pattern</span>
        <span class="flex items-center gap-1 group-hover:text-indigo-400 transition-colors">
            Ver diseño
            <svg class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
        </span>
    </div>
</a>
```

---

## 🏷️ Tags disponibles

| Clase CSS   | Color     | Uso                        |
|-------------|-----------|----------------------------|
| `tag-azure` | Azul      | Servicios Azure             |
| `tag-mongo` | Verde     | MongoDB / bases de datos    |
| `tag-multi` | Morado    | Arquitecturas multinube     |
| `tag-iac`   | Naranja   | Terraform, Bicep, ARM       |
| `tag-k8s`   | Cyan      | Kubernetes / contenedores   |
| `tag-sec`   | Rojo      | Seguridad, Zero Trust       |

---

## 🔄 Flujo de trabajo para publicar cambios

```bash
# 1. Modifica los archivos que necesites
# 2. Staging de cambios
git add .

# 3. Commit descriptivo
git commit -m "feat: add CheatSheet Kubernetes v1.29"

# 4. Push → GitHub Pages se actualiza en ~30 segundos
git push origin main
```

---

## 🛠️ Vista previa local (sin instalar nada)

Puedes previsualizar el sitio localmente con cualquiera de estos métodos:

**Python (recomendado):**
```bash
cd "D:\trainings\branding_azure_solution_architect_expert"
python -m http.server 8080
# Abre: http://localhost:8080
```

**VS Code Live Server:**
1. Instala la extensión [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Clic derecho en `index.html` → **Open with Live Server**

---

## ✅ Checklist pre-publicación

- [ ] `index.html` con link de GitHub actualizado (`YOUR_USERNAME/YOUR_REPO`)
- [ ] `git init` y primer commit realizados
- [ ] Repositorio creado en GitHub como **Public**
- [ ] GitHub Pages activado en **Settings → Pages**
- [ ] URL de GitHub Pages funcionando: `https://TU_USUARIO.github.io/cloud-arch-hub/`

---

*Hecho con ☁️ para Azure Solution Architect Expert*
