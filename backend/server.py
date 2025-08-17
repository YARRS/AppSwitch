from fastapi import FastAPI, HTTPException, Depends, status, APIRouter, Header, Query, Cookie
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.openapi.utils import get_openapi
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Vallmark Gift Articles API", version="1.0.0", docs_url=None, redoc_url=None, openapi_url=None)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/vallmark_db")
client = AsyncIOMotorClient(MONGO_URL)
db = client.vallmark_db  # Explicitly use vallmark_db database

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Database dependency
async def get_database():
    return db

# Import and include routers
from routes.auth import router as auth_router
from routes.products import router as products_router
from routes.categories import router as categories_router
from routes.cart import router as cart_router
from routes.orders import router as orders_router
from routes.inventory import router as inventory_router
from routes.campaigns import router as campaigns_router
from routes.commissions import router as commissions_router
from routes.dashboard import router as dashboard_router
from routes.inquiries import router as inquiries_router
from routes.uploads import router as uploads_router
from routes.otp import router as otp_router
from routes.addresses import router as addresses_router
import yaml
from pathlib import Path

# Make db available globally for imports
# import sys
# sys.modules['server'].db = db

# Include routers
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(categories_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(inventory_router)
app.include_router(campaigns_router)
app.include_router(commissions_router)
app.include_router(dashboard_router)
app.include_router(inquiries_router)
app.include_router(uploads_router)
app.include_router(otp_router)
app.include_router(addresses_router)

# ---------------------------------------------------------------------------
# Custom OpenAPI / Docs Integration
# ---------------------------------------------------------------------------
SPEC_PATH = Path(__file__).parent / "openapi.yaml"
# Docs security toggles
DOCS_ENABLED = os.getenv("DOCS_ENABLED", "false").lower() == "true"
DOCS_KEY = os.getenv("DOCS_KEY", "")  # optional shared secret; provide with X-Docs-Key header
SWAGGER_PERSIST_AUTH = os.getenv("SWAGGER_PERSIST_AUTH", "false").lower() == "true"
OPENAPI_MERGE_DYNAMIC = os.getenv("OPENAPI_MERGE_DYNAMIC", "true").lower() == "true"  # merge runtime routes
OPENAPI_WRITE_BACK = os.getenv("OPENAPI_WRITE_BACK", "false").lower() == "true"  # write merged spec to file

async def verify_docs_access(
    x_docs_key: str | None = Header(default=None),
    docs_key_q: str | None = Query(default=None, alias="docs_key"),
    docs_key_cookie: str | None = Cookie(default=None, alias="docs_key")
):
    """Gate documentation endpoints; allow key via header, query (?docs_key=) or cookie.
    This lets users open /api/docs?docs_key=YOUR_KEY directly in a browser.
    """
    if not DOCS_ENABLED:
        raise HTTPException(status_code=404, detail="Not Found")
    provided = x_docs_key or docs_key_q or docs_key_cookie
    if DOCS_KEY and provided != DOCS_KEY:
        raise HTTPException(status_code=403, detail="Invalid docs access key")
    return True

def load_manual_openapi():
    """Load the static openapi.yaml file if present."""
    try:
        with SPEC_PATH.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            if not isinstance(data, dict):
                raise ValueError("openapi.yaml root is not an object")
            return data
    except FileNotFoundError:
        logger.warning("openapi.yaml not found; using generated schema only")
        return {}
    except Exception as e:
        logger.error(f"Failed to load openapi.yaml: {e}")
        return {}

def build_combined_openapi():
    """Combine manual spec with dynamically generated FastAPI spec.
    Manual spec takes precedence; missing paths/schemas are added from dynamic.
    """
    dynamic = get_openapi(title=app.title, version=app.version, routes=app.routes)
    if not OPENAPI_MERGE_DYNAMIC:
        # If merging disabled and manual exists return manual else dynamic
        manual_only = load_manual_openapi()
        return manual_only or dynamic
    manual = load_manual_openapi()
    if not manual:
        combined = dynamic
    else:
        combined = manual.copy()
        # Merge top-level tags (avoid duplicates by name)
        if 'tags' in dynamic:
            existing_names = {t.get('name') for t in combined.get('tags', []) if isinstance(t, dict)}
            extra_tags = [t for t in dynamic.get('tags', []) if isinstance(t, dict) and t.get('name') not in existing_names]
            if extra_tags:
                combined.setdefault('tags', []).extend(extra_tags)
        # Merge paths
        combined.setdefault('paths', {})
        for p, obj in dynamic.get('paths', {}).items():
            if p not in combined['paths']:
                combined['paths'][p] = obj
            else:
                # Add missing methods inside existing path
                for method, op_def in obj.items():
                    if method not in combined['paths'][p]:
                        combined['paths'][p][method] = op_def
        # Merge components.schemas without overwriting
        dyn_schemas = dynamic.get('components', {}).get('schemas', {})
        if dyn_schemas:
            combined.setdefault('components', {}).setdefault('schemas', {})
            for name, schema_def in dyn_schemas.items():
                combined['components']['schemas'].setdefault(name, schema_def)
        # Merge securitySchemes similarly
        dyn_sec = dynamic.get('components', {}).get('securitySchemes', {})
        if dyn_sec:
            combined.setdefault('components', {}).setdefault('securitySchemes', {})
            for name, sec_def in dyn_sec.items():
                combined['components']['securitySchemes'].setdefault(name, sec_def)
    # Optionally write back
    if OPENAPI_WRITE_BACK:
        try:
            with SPEC_PATH.open('w', encoding='utf-8') as f:
                yaml.safe_dump(combined, f, sort_keys=False, allow_unicode=True)
        except Exception as e:
            logger.warning(f"Failed to write merged openapi.yaml: {e}")
    return combined

@app.get("/api/openapi.json", include_in_schema=False, dependencies=[Depends(verify_docs_access)])
async def raw_openapi():
    """Return merged OpenAPI schema so new routes appear automatically."""
    return JSONResponse(build_combined_openapi())

def _sanitize_for_redoc(spec: dict) -> dict:
    """Minimal cleanup for manual spec so ReDoc doesn't blank out.
    Remove malformed parameters (missing name/schema) and ensure requestBodies have content.
    """
    paths = spec.get('paths', {})
    for path, operations in paths.items():
        if isinstance(operations, dict):
            for method, op in operations.items():
                if not isinstance(op, dict):
                    continue
                params = op.get('parameters')
                if isinstance(params, list):
                    valid = [p for p in params if isinstance(p, dict) and 'name' in p and 'schema' in p]
                    if valid:
                        op['parameters'] = valid
                    else:
                        op.pop('parameters', None)
                rb = op.get('requestBody')
                if isinstance(rb, dict) and rb.get('required') and 'content' not in rb:
                    rb['content'] = {'application/json': {'schema': {'type': 'object'}}}
    return spec

@app.get('/api/openapi.redoc.json', include_in_schema=False, dependencies=[Depends(verify_docs_access)])
async def redoc_spec():
    spec = build_combined_openapi()
    try:
        spec = _sanitize_for_redoc(spec)
    except Exception as e:
        logger.warning(f"Spec sanitation failed: {e}")
    return JSONResponse(spec)

SWAGGER_UI_HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\" />
    <title>API Docs - Swagger UI</title>
    <link rel=\"stylesheet\" href=\"https://unpkg.com/swagger-ui-dist@5/swagger-ui.css\" />
    <style>body { margin:0; background:#fafafa; }</style>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
        // Capture ?docs_key=... and store in cookie for subsequent spec requests
        (function(){
            const params = new URLSearchParams(window.location.search);
            const key = params.get('docs_key');
            if(key){ document.cookie = 'docs_key='+key+';path=/;SameSite=Strict'; }
        })();
    window.onload = () => {
        window.ui = SwaggerUIBundle({
            url: '/api/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            persistAuthorization: {persist_auth},
            layout: 'BaseLayout'
        });
    };
</script>
</body>
</html>
"""

@app.get("/api/docs", include_in_schema=False, dependencies=[Depends(verify_docs_access)])
async def swagger_ui():
    html = SWAGGER_UI_HTML_TEMPLATE.replace('{persist_auth}', 'true' if SWAGGER_PERSIST_AUTH else 'false')
    return HTMLResponse(html)

REDOC_HTML = """<!DOCTYPE html>
<html lang=\"en\">
    <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />
        <title>API Docs - ReDoc</title>
        <style>
            html,body { height:100%; margin:0; padding:0; }
            body { font-family: system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif; background:#f8fafc; }
            #redoc-container { height:100%; }
            .topbar { display:none!important; }
        </style>
                <script src=\"https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js\"></script>
    </head>
    <body>
                <div id=\"redoc-container\">Loading API documentation...</div>
                <script>
                                                (function(){
                                                    const params = new URLSearchParams(window.location.search);
                                                    const key = params.get('docs_key');
                                                    if(key){ document.cookie = 'docs_key='+key+';path=/;SameSite=Strict'; }
                                                })();
                        (function(){
                                fetch('/api/openapi.redoc.json', {cache:'no-store'})
                                    .then(r=>r.json())
                                    .then(spec => {
                                        Redoc.init(spec, {
                                            hideDownloadButton: false,
                                            expandResponses: '200,201',
                                            scrollYOffset: 56,
                                            theme: { colors: { primary: { main: '#2563eb' } } }
                                        }, document.getElementById('redoc-container'));
                                    })
                                    .catch(err => {
                                        const el = document.getElementById('redoc-container');
                                        el.innerHTML = '<pre style=\"color:red;padding:1rem;\">Failed to load spec: '+(err && err.message)+'\\nCheck console.</pre>';
                                        console.error('Failed to load OpenAPI spec for ReDoc', err);
                                    });
                        })();
                </script>
    </body>
</html>"""

@app.get("/api/redoc", include_in_schema=False, dependencies=[Depends(verify_docs_access)])
async def redoc_ui():
    return HTMLResponse(REDOC_HTML)

@app.get("/api/openapi.yaml", include_in_schema=False, dependencies=[Depends(verify_docs_access)])
async def raw_openapi_yaml():
        if OPENAPI_WRITE_BACK and SPEC_PATH.exists():
            # When write-back is enabled we always have latest on disk
            return FileResponse(SPEC_PATH)
        # Otherwise deliver a fresh merged YAML (do not overwrite file)
        import io
        spec = build_combined_openapi()
        buf = io.StringIO()
        yaml.safe_dump(spec, buf, sort_keys=False, allow_unicode=True)
        return HTMLResponse(buf.getvalue(), media_type='application/yaml')

# Startup event handler
@app.on_event("startup")
async def startup_event():
    """Handle application startup tasks"""
    logger.info("🚀 Vallmark Gift Articles Backend starting up...")
    
    try:
        # Import and run startup tasks
        from startup_tasks import StartupTasks
        
        startup_tasks = StartupTasks(db)
        await startup_tasks.run_startup_tasks()
        
        logger.info("✅ Backend startup completed successfully")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        # Don't fail the entire application

# Health check endpoint
@app.get("/api/health")
async def health_check():
    try:
        # Test database connection
        await db.list_collection_names()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Service unhealthy")

# Root endpoint
@app.get("/api/")
async def root():
    return {"message": "Vallmark Gift Articles API", "version": "1.0.0"}

# Test endpoint for frontend connection
@app.get("/api/test")
async def test_connection():
    return {
        "message": "Backend connection successful",
        "timestamp": "2024-01-01T00:00:00Z",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)