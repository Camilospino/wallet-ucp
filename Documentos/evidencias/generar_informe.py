# -*- coding: utf-8 -*-
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from docx_builder import DocxBuilder
E = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(E, "..", "Laboratorio2_WalletUCP_Camilo.docx")
d = DocxBuilder()
# -*- coding: utf-8 -*-
d.p("LABORATORIO 2", b=True, size=30, color="1F3A93", align="center", space_after=40, space_before=1400)
d.p("DESPLIEGUE CI/CD, NGINX Y PIPELINE CON AMBIENTES", b=True, size=26, color="1F3A93", align="center", space_after=0)
d.p("QA Y PRODUCCIÓN APLICADO AL PROYECTO WALLETUCP", b=True, size=26, color="1F3A93", align="center", space_after=400)
d.p("CAMILO RODRÍGUEZ", b=True, size=26, align="center", space_after=500)
d.p("UNIVERSIDAD CATÓLICA DE PEREIRA", b=True, size=24, align="center", space_after=40)
d.p("OPTATIVA III", align="center", space_after=30)
d.p("FACULTAD DE CIENCIAS BÁSICAS E INGENIERÍA", align="center", space_after=30)
d.p("TECNOLOGÍA EN DESARROLLO DE SOFTWARE", align="center", space_after=500)
d.p("PEREIRA", align="center", space_after=30)
d.p("30/09/2026", align="center", space_after=400)
d.p("Repositorio:  https://github.com/Camilospino/wallet-ucp", mono=True, size=18, align="center", color="2B4C9B")
d.pagebreak()

d.h("Nota de alcance", 1)
d.p("Este laboratorio es el mismo enunciado del informe de referencia (Despliegue CI/CD con WSL, NGINX, GitLab Runner y pipeline), pero aplicado al proyecto WalletUCP. Como el equipo de trabajo de este proyecto es macOS y no Windows 11, el subsistema Linux se implementa con un contenedor Docker con Ubuntu 24.04 en lugar de WSL 2, y la integración y despliegue continuo se hace con GitHub Actions y un runner autoalojado en lugar de GitLab CI/CD y GitLab Runner.")
d.p("Todas las evidencias de este documento fueron capturadas de la configuración real y en funcionamiento del proyecto: las salidas de terminal provienen de comandos ejecutados en esta máquina, las capturas de la aplicación son de la app real servida por NGINX, y los datos de los pipelines provienen de la API de GitHub.")

d.h("Repositorio del proyecto", 1)
d.p("https://github.com/Camilospino/wallet-ucp", mono=True, color="2B4C9B")
d.p("Repositorio remoto de GitHub con dos ramas: develop (ambiente QA) y main (ambiente Producción). El pipeline está definido en .github/workflows/pipeline.yml.")

d.h("Descripción de la aplicación", 1)
d.p("WalletUCP es una billetera virtual académica que permite a los usuarios administrar saldos y realizar operaciones financieras simuladas entre ellos. Es un proyecto 100 % educativo: no se conecta a bancos ni a pasarelas de pago reales y no maneja dinero real bajo ninguna circunstancia. Todos los usuarios, saldos y transacciones son ficticios. El valor del proyecto es académico: demostrar cómo un backend procesa dinero simulado garantizando que los saldos nunca se pierdan ni se dupliquen.")
d.p("Con la aplicación, el usuario puede:", space_after=80)
d.bullets([
    "Registrarse e iniciar sesión. El registro valida los datos en el frontend y en el backend, guarda la contraseña como hash con bcrypt y devuelve un token JWT de 24 horas. Al registrarse se crea automáticamente su billetera con saldo 0.00.",
    "Consultar su saldo y sus últimos movimientos. El panel principal (/dashboard) muestra el saldo disponible y los cinco movimientos más recientes.",
    "Depositar. Permite ingresar dinero simulado a la billetera propia, y el movimiento queda registrado con el saldo anterior y el resultante.",
    "Retirar. Permite sacar dinero simulado de la billetera propia. Si el monto es mayor que el saldo disponible, la operación se rechaza y no se toca la base de datos.",
    "Transferir. Permite enviar dinero simulado a la billetera de otro usuario registrado. Genera dos movimientos (un débito en el origen y un crédito en el destino) ligados a una misma transacción.",
    "Consultar el historial de transacciones, con filtro por tipo de movimiento.",
    "Usar el panel de administración: un usuario con rol ADMIN puede ver todos los usuarios, billeteras y transacciones, y bloquear o desbloquear usuarios.",
    "Editar su perfil.",
])
d.p("La aplicación tiene dos ambientes diferentes. El primero es QA (http://wallet-ucp-qa.local:8080), que se utiliza para hacer pruebas y revisar los cambios antes de pasarlos a la versión final. El segundo es Producción (http://wallet-ucp.local:8080), que corresponde a la versión definitiva. El nombre del ambiente se muestra en la barra de navegación para que nunca se confunda uno con el otro al hacer una prueba.")
d.p("Cada ambiente tiene su propia base de datos, por lo que los datos utilizados durante las pruebas no se mezclan con los datos de Producción. Un depósito hecho en QA no altera los saldos de Producción. Esta separación se demuestra con evidencia real en la sección 5 de este documento.")

d.h("Tecnología utilizada", 1)
d.tbl([
    ["Capa", "Tecnología"],
    ["Sistema operativo anfitrión", "macOS (MacBook Air, Apple Silicon)"],
    ["Entorno Linux del servidor", "Contenedor Docker con Ubuntu 24.04 (laboratorio-ubuntu), equivalente a WSL 2 en Windows"],
    ["Servidor web", "NGINX 1.24"],
    ["Lenguaje del servidor", "Node.js 20 y Express.js 4"],
    ["Interfaz", "React 18, Bootstrap 5 y Vite 7 (HTML5 y CSS3)"],
    ["Base de datos", "PostgreSQL (16 en el servidor)"],
    ["Driver de base de datos", "pg 8"],
    ["Autenticación", "JSON Web Token (jsonwebtoken) y bcryptjs"],
    ["Documentación de la API", "Swagger / OpenAPI"],
    ["Contenedores", "Docker y Docker Compose"],
    ["Control de versiones", "Git"],
    ["Repositorio remoto", "GitHub (github.com)"],
    ["Integración y despliegue continuo", "GitHub Actions"],
    ["Ejecutor de pipelines", "GitHub Actions self-hosted runner (etiqueta self-hosted)"],
    ["Editor de código", "Visual Studio Code"],
], widths=[34, 66])

d.h("Diferencias frente a la tecnología del enunciado de referencia", 2)
d.tbl([
    ["Enunciado de referencia", "Este proyecto", "Por qué"],
    ["Windows 11 + WSL 2 + Ubuntu", "macOS + contenedor Docker con Ubuntu 24.04", "El equipo de trabajo es macOS, donde no existe WSL 2. El contenedor cumple la misma función: un Linux donde instalar NGINX, Node.js y servir los dos ambientes."],
    ["PHP 8 + PHP-FPM + MariaDB", "Node.js 20 + Express + PostgreSQL", "El proyecto WalletUCP está escrito en JavaScript, con arquitectura en capas y transacciones SQL reales de PostgreSQL."],
    ["HTML5 y CSS3", "React 18 + Vite 7 + Bootstrap 5", "La interfaz es una SPA con React Router."],
    ["GitLab + GitLab CI/CD + GitLab Runner", "GitHub + GitHub Actions + runner autoalojado", "Es la plataforma de integración continua con la que está construido el proyecto. El flujo es equivalente: develop despliega a QA y main despliega a Producción tras aprobar el Pull Request."],
    ["MariaDB local en Ubuntu", "PostgreSQL en el servidor web", "Cada ambiente tiene su propia base de datos, igual que en el enunciado cada ambiente tenía su propia base de datos."],
], widths=[24, 26, 50])

d.h("Motor de base de datos utilizado", 1)
d.p("Para guardar la información de los usuarios, las billeteras, las transacciones y los movimientos se utilizó PostgreSQL, que corre dentro del contenedor del servidor web. No se utiliza una base de datos en la nube.")
d.p("Se crearon dos bases de datos, una para cada ambiente de la aplicación:", space_after=80)
d.tbl([
    ["Ambiente", "Base de datos", "Backend Express"],
    ["QA", "walletucp_qa", "puerto 5001"],
    ["Producción", "walletucp", "puerto 5000"],
], widths=[20, 40, 40])
d.p("Para conectar la aplicación con la base de datos se creó el usuario walletucp, que tiene los permisos necesarios para trabajar con estas bases de datos. No se utiliza directamente el usuario administrador postgres. La conexión se hace por la variable de entorno DATABASE_URL, por ejemplo:")
d.code("DATABASE_URL=postgresql://walletucp:walletucp_password@127.0.0.1:5432/walletucp_qa")

d.h("Tablas de la base de datos", 2)
d.p("Las dos bases de datos tienen las mismas cuatro tablas:", space_after=80)
d.tbl([
    ["Tabla", "Guarda"],
    ["usuarios", "id, nombre, apellido, email, password_hash, telefono, estado (ACTIVE o BLOCKED) y rol (USER o ADMIN)."],
    ["billeteras", "id, usuario_id, saldo, estado y fechas. El saldo es NUMERIC(15,2), nunca un decimal flotante, y tiene la restricción CHECK (saldo >= 0) que impide a la base de datos misma aceptar un saldo negativo."],
    ["transacciones", "id, referencia (única), billeteras de origen y destino, tipo (DEPOSIT, WITHDRAW, TRANSFER), monto, estado (PENDING, COMPLETED, FAILED, CANCELLED) y descripcion."],
    ["movimientos", "id, wallet_id, transaction_id, tipo (CREDIT o DEBIT), monto, saldo_anterior y saldo_resultante."],
], widths=[20, 80])
d.p("Las tablas transacciones y movimientos cumplen dos funciones: guardar el historial que ve el usuario, y dejar registro de cada cambio de saldo. Las columnas saldo_anterior y saldo_resultante hacen que el libro mayor sea auditable: cualquier saldo actual se puede reconstruir sumando los movimientos.")

d.h("El mismo código para los dos ambientes", 2)
d.p("El mismo código de la aplicación se utiliza tanto en QA como en Producción. Lo que cambia es la configuración de cada ambiente, que le indica al backend qué base de datos debe utilizar mediante la variable DATABASE_URL. En el backend la conexión se crea una sola vez, en backend/src/config/database.js, a partir de esa variable, de modo que ninguna línea de código cambia entre ambientes: solo cambia el valor del entorno.")
d.p("Las tablas se crean con el script database/migrations/01-create_tables.sql, que es idempotente (usa CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS y DROP TRIGGER IF EXISTS antes de crear los triggers), por lo que se puede volver a aplicar sin romper nada. Los datos de prueba iniciales se cargan con database/seeds/01-seed_data.sql, que también es idempotente.")

d.h("Transacciones implementadas contra la base de datos", 1)
d.p("A diferencia del enunciado de referencia, donde la operación demostrada es un CRUD sobre una tabla de contactos, en WalletUCP las operaciones que modifican dinero se implementan como transacciones SQL atómicas. Cada una se ejecuta dentro de un BEGIN ... COMMIT, y si algo falla se ejecuta un ROLLBACK que deja la base de datos exactamente como estaba.")

d.h("Las cuatro operaciones", 2)
d.tbl([
    ["Operación", "Archivo", "Endpoint", "Efecto en la base de datos"],
    ["Registrar un usuario", "backend/src/services/authService.js", "POST /api/auth/register", "Inserta el usuario y crea su billetera en la misma transacción. Si fallara solo el INSERT de la billetera, quedaría un usuario que nunca podría operar."],
    ["Depositar", "backend/src/services/walletService.js", "POST /api/wallets/deposit", "Bloquea la billetera, suma el saldo, inserta la transacción y un movimiento de tipo CREDIT."],
    ["Retirar", "backend/src/services/walletService.js", "POST /api/wallets/withdraw", "Bloquea la billetera, verifica que el saldo alcance, descuenta el monto e inserta un movimiento de tipo DEBIT."],
    ["Transferir", "backend/src/services/walletService.js", "POST /api/transfers", "Bloquea las dos billeteras, descuenta del origen, suma al destino, e inserta una transacción con dos movimientos: un DEBIT y un CREDIT."],
], widths=[18, 26, 22, 34])
d.p("Además, el historial se consulta con GET /api/transactions y GET /api/transactions/:id, y el panel de administración con GET /api/admin/users, GET /api/admin/wallets, GET /api/admin/transactions, PATCH /api/admin/users/:id/block y PATCH /api/admin/users/:id/unblock.")

d.h("Cómo se garantiza la atomicidad", 2)
d.p("Todo el manejo de dinero vive en una función reutilizada por las tres operaciones financieras, withTransaction, definida en walletService.js. Su forma esencial es:")
d.code("const withTransaction = async (fn) => {\n  const client = await pool.connect();\n  try {\n    await client.query('BEGIN');\n    const result = await fn(client);\n    await client.query('COMMIT');\n    return result;\n  } catch (error) {\n    await client.query('ROLLBACK');\n    throw error;\n  } finally {\n    client.release();\n  }\n};")
d.p("Hay un detalle que resulta fácil de equivocar y que este proyecto resolvió de forma explícita: cada función de repositorio recibe un client opcional como último argumento y por defecto usa el pool compartido. Si dentro de la transacción se llamara a un repositorio sin pasarle ese client, la sentencia se ejecutaría en otra conexión distinta. En ese caso el BEGIN/COMMIT/ROLLBACK ya no la cubriría y los bloqueos de SELECT ... FOR UPDATE se liberarían de inmediato, destruyendo en silencio tanto la atomicidad como el control de concurrencia. Por eso la regla del proyecto es: dentro de un withTransaction, ningún repositorio se llama sin client.")

d.h("Control de concurrencia", 2)
d.p("Para que dos operaciones simultáneas sobre la misma billetera no se pisen, cada operación financiera bloquea primero la fila con SELECT ... FOR UPDATE. La fila queda bloqueada hasta el COMMIT o el ROLLBACK, así que la segunda operación concurrente tiene que esperar y, cuando entra, ya lee el saldo actualizado. Sin este bloqueo, dos retiros simultáneos sobre el mismo saldo podrían pasar los dos la validación y producir un saldo negativo (un lost update).")
d.p("En el caso de la transferencia se bloquean las dos billeteras, y para evitar un deadlock se hace siempre en el mismo orden: se ordenan los identificadores de usuario de forma ascendente y se bloquea primero el menor. Así, dos transferencias simultáneas en direcciones opuestas entre los mismos dos usuarios no pueden quedar esperando la una a la otra.")

d.h("Protección contra la inyección SQL", 2)
d.p("Todas las consultas se hacen con consultas parametrizadas del driver pg, donde los valores viajan como parámetros separados de la sentencia:")
d.code("const query = 'SELECT * FROM billeteras WHERE usuario_id = $1 FOR UPDATE';\nconst result = await client.query(query, [usuarioId]);")
d.p("Los marcadores $1, $2 son posicionales y los valores nunca se interpolan en la cadena de SQL, de modo que la aplicación no depende de escapar comillas ni de una lista negra de palabras. La contraseña nunca se consulta en claro: se guarda como hash bcrypt y la comparación se hace con bcrypt.compare.")

d.h("La transacción que se demuestra", 2)
d.p("La operación que se demuestra en las evidencias es la transferencia, porque es la que ejercita las dos garantías del proyecto a la vez: mueve saldo entre dos billeteras y, si algo falla en la mitad, PostgreSQL revierte el débito, el crédito, la transacción y el movimiento como una sola unidad. La secuencia completa es:", space_after=80)
d.bullets([
    "El usuario autenticado entra a /transfer, escribe el correo del destinatario y el monto, y envía el formulario.",
    "El backend valida el monto, busca al destinatario y rechaza el caso en que sea el mismo usuario o esté bloqueado.",
    "Se abre la transacción y se bloquean las dos billeteras en orden ascendente.",
    "Se comprueba el saldo del origen. Si no alcanza, se lanza el error INSUFFICIENT_BALANCE y el ROLLBACK deja todo intacto.",
    "Se descuenta del origen, se suma al destino, se inserta la transacción con su referencia y se insertan los dos movimientos con saldo_anterior y saldo_resultante.",
    "El COMMIT confirma todo. Cualquier fallo en el paso anterior provoca el ROLLBACK y la aplicación responde un error sin haber modificado nada.",
], numbered=True)
d.p("En el paso 4 hay una garantía adicional: la restricción CHECK (saldo >= 0) está en la base de datos, así que ni siquiera un error en la lógica de la aplicación podría dejar un saldo negativo guardado.")

d.h("Pruebas que demuestran el comportamiento", 2)
d.p("El proyecto no se limita a decir que es atómico: lo prueba. Los tests de integración del backend, ejecutados también en el pipeline, verifican contra un PostgreSQL real que:", space_after=80)
d.bullets([
    "Un fallo forzado después del débito hace que PostgreSQL revierta el saldo, la transacción y los movimientos (atomicidad).",
    "Depósitos y retiros simultáneos no producen lost updates y el saldo nunca queda negativo (concurrencia).",
    "Transferencias bidireccionales simultáneas entre dos usuarios no se pierden ni generan un deadlock.",
    "El libro mayor siempre cuadra con el saldo de cada billetera.",
    "La precisión decimal es exacta: 0.1 + 0.2 = 0.30, gracias a NUMERIC(15,2).",
])

d.pagebreak()
d.h("1. Evidencias del entorno", 1)
d.h("1.1. Contenedor Linux (equivalente a WSL) funcionando", 2)
d.p("El enunciado pide evidencia de WSL funcionando. En este proyecto, el sistema Linux del servidor es un contenedor Docker con Ubuntu 24.04, que cumple la misma función. La siguiente captura muestra los contenedores en ejecución, la versión de NGINX, la versión de Ubuntu y la de Node.js.")
F_ENTORNO = d.fig("entorno", os.path.join(E, "ev_01_entorno.png"), "Contenedores en ejecución, NGINX 1.24.0, Ubuntu 24.04.4 y Node.js 22.23.2. Al final se ven los dos procesos Node independientes: el de Producción en el puerto 5000 con la base walletucp, y el de QA en el puerto 5001 con la base walletucp_qa.")

d.h("1.2. Los dos backends del servidor, cada uno con su base de datos", 2)
d.p("Este es el punto central del laboratorio. Dentro del contenedor del servidor web hay dos procesos Node independientes, y cada uno apunta a una base de datos distinta:")
d.tbl([
    ["Proceso", "Puerto", "NODE_ENV", "Base de datos", "Ambiente"],
    ["Node (PID 45)", "5000", "production", "walletucp", "Producción"],
    ["Node (PID 68)", "5001", "production", "walletucp_qa", "QA"],
], widths=[20, 14, 20, 24, 22])
d.pf("Ambos responden correctamente en su endpoint de salud, lo que confirma que los dos ambientes están levantados. Se comprueba en la Figura {entorno}: las dos últimas líneas muestran el status OK de cada backend.", "entorno")

d.h("1.3. NGINX funcionando", 2)
d.pf("NGINX 1.24.0 responde en los tres puertos de publicación. La Figura {entorno} muestra el arranque con el comando nginx -v, y las Figuras {loginqa} a {comparativa} muestran la aplicación servida a través de él.", "entorno", "loginqa", "comparativa")
d.code("$ docker exec laboratorio-ubuntu nginx -v\nnginx version: nginx/1.24.0 (Ubuntu)\n\n$ curl -I http://localhost:8081\nHTTP/1.1 200 OK\nServer: nginx/1.24.0 (Ubuntu)")

d.h("1.4. Bases de datos configuradas", 2)
d.p("El servidor de base de datos PostgreSQL corre dentro del contenedor del servidor web, y contiene las dos bases, una por ambiente.")
F_BASES = d.fig("bases", os.path.join(E, "ev_05_bases_datos.png"), "Bases de datos del servidor: postgres, walletucp (Producción) y walletucp_qa (QA). Abajo, los saldos de cada ambiente, que son distintos entre sí.")

d.h("2. Evidencias de la configuración de NGINX", 1)
d.p("NGINX tiene un server block independiente por ambiente, ambos habilitados en /etc/nginx/sites-enabled/ dentro del contenedor del servidor web.")
d.tbl([
    ["", "Ambiente QA", "Ambiente Producción"],
    ["Archivo", "wallet-ucp-qa", "wallet-ucp-produccion"],
    ["server_name", "wallet-ucp-qa.local", "wallet-ucp.local"],
    ["root", "/var/www/html/wallet-ucp-qa", "/var/www/html/wallet-ucp-produccion"],
    ["Logs", "wallet-ucp-qa.access.log / .error.log", "wallet-ucp-produccion.access.log / .error.log"],
    ["proxy_pass de /api/", "http://127.0.0.1:5001", "http://127.0.0.1:5000"],
    ["Backend", "Express QA (BD walletucp_qa)", "Express Producción (BD walletucp)"],
    ["Rama que lo despliega", "develop", "main"],
], widths=[22, 39, 39])

d.h("2.1. Server blocks de QA y de Producción", 2)
d.p("La configuración completa de ambos ambientes, tal como está en el servidor. Se observa el proxy inverso hacia el backend de cada ambiente y la configuración de la SPA con try_files, necesaria porque la aplicación usa React Router y sin ella una recarga directa de /dashboard devolvería 404.")
F_NGINX = d.fig("nginx", os.path.join(E, "ev_02_nginx.png"), "Server blocks de QA y de Producción completos. Cada ambiente tiene su propio server_name, su propio root y su propio proxy_pass hacia un backend diferente.")

d.h("2.2. Los dos directorios de publicación", 2)
d.p("Cada ambiente se publica en su propia carpeta, nunca sobre la misma:")
d.code("$ docker exec laboratorio-ubuntu ls /var/www/html\nwallet-ucp-produccion\nwallet-ucp-qa\n\n$ docker exec laboratorio-ubuntu ls /var/www/html/wallet-ucp-qa\nassets\nfavicon.svg\nindex.html\nsite.webmanifest")
d.p("Ambas carpetas contienen el bundle que produjo el job build del pipeline, es decir, exactamente el mismo código que pasó las pruebas.")

d.h("2.3. Archivo de hosts del equipo anfitrión", 2)
d.p("Para que wallet-ucp.local y wallet-ucp-qa.local resuelvan a la máquina local, se añaden estas dos líneas al archivo /etc/hosts del sistema anfitrión (macOS):")
d.code("127.0.0.1    wallet-ucp-qa.local\n127.0.0.1    wallet-ucp.local")
d.p("Nota sobre este punto en macOS: editar /etc/hosts requiere permisos de superusuario. Por eso, además del acceso por los dominios, se configuró un tercer server block de solo revisión llamado wallet-ucp-preview, que sirve los mismos dos sitios por puerto y no requiere sudo. Este bloque puede eliminarse sin riesgo cuando ya se pueda editar /etc/hosts, y no altera los ambientes del laboratorio, que siguen sirviéndose por su dominio.")

d.h("2.4. Acceso a QA y a Producción", 2)
d.p("El ambiente de QA se abre en http://wallet-ucp-qa.local:8080 y el de Producción en http://wallet-ucp.local:8080. Para la revisión local sin sudo se usan los puertos alternos 8081 (QA) y 8082 (Producción). Las capturas de la sección 5 muestran ambas pantallas.")

d.h("3. Evidencias del repositorio", 1)
d.h("3.1. Ramas, commits y etiquetas", 2)
d.p("El repositorio tiene dos ramas de trabajo, que corresponden a los dos ambientes, más las etiquetas de versión creadas por el pipeline.")
d.fig("repo", os.path.join(E, "ev_03_repositorio.png"), "Ramas del repositorio (develop y main), historial de commits, etiquetas v1.0.0 a v1.0.3, y el remoto en GitHub.")
d.tbl([
    ["Rama", "Ambiente", "Regla"],
    ["develop", "QA", "Recibe push directos; cada push dispara el despliegue a QA."],
    ["main", "Producción", "Está protegida: nada llega a main sin un Pull Request aprobado. Cada push a main dispara el despliegue a Producción."],
], widths=[18, 20, 62])
d.p("El equivalente en GitHub del Merge Request de GitLab es el Pull Request: se abre de develop hacia main, se revisa el diff, se deja comentarios, se aprueba y se combina. Al combinar, ese push a main es lo que despliega a Producción. Las capturas de esa pantalla se toman manualmente, porque requieren la sesión iniciada en la cuenta de GitHub.")

d.h("3.2. Versionado por etiquetas", 2)
d.pf("Como extensión, el pipeline crea una etiqueta vX.Y.Z por cada despliegue a Producción, de manera que cada combinación a main queda asociada a una versión. Al momento de redactar este informe el repositorio tenía las etiquetas v1.0.0 a v1.0.3, visibles en la Figura {repo}; la numeración crece sola con cada nuevo despliegue.", "repo")

d.h("4. Evidencias de los pipelines", 1)
d.p("El pipeline está definido en .github/workflows/pipeline.yml y se dispara en cada push y cada Pull Request contra main y develop. Cada job hace una sola cosa y solo publica el artefacto si todo lo anterior pasó.")

d.h("4.1. Los jobs del pipeline", 2)
d.tbl([
    ["Job", "Cuándo corre", "Qué hace"],
    ["test", "siempre", "Lint y pruebas de backend (unitarios e integración contra PostgreSQL) y de frontend, en Node 20 y 22."],
    ["security-scan", "siempre", "npm audit bloqueante sobre las dependencias de producción, informativo sobre las de desarrollo, y escaneo de secretos con TruffleHog."],
    ["build", "tras test y security-scan", "Compila frontend/dist y lo publica como artefacto del workflow. Corre en el runner autoalojado."],
    ["smoke-test", "en push", "Levanta el stack con docker compose y comprueba que /health responde, que el frontend sirve la app y que un login real contra la API funciona."],
    ["deploy_dev", "push a develop", "Copia el artefacto a /var/www/html/wallet-ucp-qa (ambiente QA)."],
    ["deploy_main", "push a main", "Copia el artefacto a /var/www/html/wallet-ucp-produccion (ambiente Producción)."],
    ["version", "push a main", "Calcula la siguiente etiqueta vX.Y.Z y la publica."],
], widths=[20, 22, 58])
d.fig("flujo", os.path.join(E, "ev_08_flujo_pipeline.png"), "Flujo del pipeline: develop despliega a QA y main despliega a Producción, pasando antes por los mismos jobs de verificación.")
d.p("Nótese que build depende de test y de security-scan, y que los jobs de despliegue dependen de build. Por eso nunca se despliega código que no haya pasado las pruebas ni el escaneo de seguridad.")

d.h("4.2. Ejecuciones reales del pipeline", 2)
d.p("La siguiente figura muestra los datos reales del historial de ejecuciones del repositorio, obtenidos de la API de GitHub. Se ve que las últimas ejecuciones, tanto de develop como de main, terminaron con resultado success.")
d.fig("pipelines", os.path.join(E, "ev_04_pipelines.png"), "Historial real de ejecuciones del pipeline. Las últimas ejecuciones de develop y de main aparecen como success, junto con el commit sobre el que se ejecutó cada una.")

d.h("4.3. La regla de protección de main", 2)
d.p("En GitHub, el equivalente de las reglas de protección de rama de GitLab se configura en Settings → Branches → Branch protection rules. En la rama main de este repositorio la regla quedó así:")
d.bullets([
    "Require a pull request before merging: nada llega a main sin un Pull Request abierto y combinado.",
    "Require approvals: 1 aprobación antes de combinar.",
    "Require status checks to pass before merging: test (20.x), test (22.x), security-scan y build.",
    "Require branches to be up to date before merging: el PR tiene que incluir el main más reciente.",
])
d.p("Los cuatro checks exigidos son precisamente los jobs que corren en un Pull Request. No se exigieron deploy_main, smoke-test ni version porque esos tres solo se ejecutan en un push, no al abrir un PR: exigirlos habría dejado el PR bloqueado para siempre. Tampoco se activó la casilla Do not allow bypassing the above settings, que en un proyecto de un solo autor dejaría el repositorio sin poder avanzar.")
d.fig("proteccion", os.path.join(E, "ev_09_proteccion_main.png"), "Regla de protección de la rama main en GitHub: Pull Request requerido, 1 aprobación, los cuatro status checks obligatorios y la rama al día antes de combinar.", max_width_in=6.9)

d.h("4.4. El Pull Request, la aprobación y la combinación", 2)
d.p("El equivalente en GitHub del Merge Request de GitLab es el Pull Request. Se abre de develop hacia main, se revisa el diff y, cuando los cuatro checks obligatorios están en verde y el PR está aprobado, se combina. Ese push a main es el que dispara deploy_main y el job version, que crea la siguiente etiqueta vX.Y.Z.")
d.fig("pr_verde", os.path.join(E, "ev_10_pull_request_verde.png"), "Pull Request de develop hacia main con los cuatro checks obligatorios en verde y la aprobación registrada antes de combinar.", max_width_in=6.9)
d.fig("pr_merged", os.path.join(E, "ev_11_pull_request_merged.png"), "El mismo Pull Request ya en estado Merged, con el commit de combinación visible.", max_width_in=6.9)

d.h("4.5. El runner autoalojado y las ejecuciones", 2)
d.p("Los jobs de despliegue y el job build no corren en los servidores de GitHub: corren en el runner autoalojado del laboratorio, un contenedor Ubuntu 24.04 con la etiqueta self-hosted. Que esté en línea es la condición para que el check build pueda reportarse y para que el PR pueda combinarse.")
d.fig("runners", os.path.join(E, "ev_12_runners.png"), "Settings → Runners del repositorio, con el runner autoalojado registrado, en línea y con la etiqueta self-hosted.", max_width_in=6.9)
d.pf("La Figura {pipelines} muestra el historial de ejecuciones. Después de combinar el Pull Request, la ejecución de main despliega a Producción y crea la nueva etiqueta de versión, que es la que aparece en la Figura {repo}.", "pipelines", "repo")
d.fig("acciones", os.path.join(E, "ev_13_actions.png"), "Pestaña Actions con una ejecución completa en verde, con todos los jobs del recorrido de despliegue a Producción.", max_width_in=6.9)

d.h("5. Evidencias del aplicativo", 1)
d.p("Usuarios de prueba creados por el script de datos iniciales:")
d.tbl([
    ["Correo", "Contraseña", "Rol"],
    ["user1@example.com", "User123!", "Usuario"],
    ["user2@example.com", "User123!", "Usuario"],
    ["admin@example.com", "Admin123!", "Administrador"],
], widths=[40, 30, 30])

d.h("5.1. Inicio de sesión", 2)
d.p("La aplicación en los dos ambientes. En cada caso la barra de navegación muestra la etiqueta del ambiente, lo que permite confirmar de un vistazo que se está viendo un sitio distinto del otro.")
d.fig("loginqa", os.path.join(E, "app_qa_01_login.png"), "Pantalla de inicio de sesión del ambiente QA, en wallet-ucp-qa.local:8080 (puerto alterno 8081).", max_width_in=5.4)
d.fig("loginprod", os.path.join(E, "app_prod_01_login.png"), "Pantalla de inicio de sesión del ambiente Producción, en wallet-ucp.local:8080 (puerto alterno 8082).", max_width_in=5.4)

d.h("5.2. El panel principal en los dos ambientes", 2)
d.p("El usuario user1@example.com inicia sesión en ambos ambientes. Los saldos que se muestran son distintos, y los movimientos también, lo que demuestra que cada ambiente lee de su propia base de datos.")
d.fig("dashqa", os.path.join(E, "app_qa_02_dashboard.png"), "Panel principal del ambiente QA. Saldo $ 69.500,00. Los dos débitos de $ 750,00 corresponden a las transferencias de prueba que se documentan en la Figura {transaccion}.", max_width_in=6.4)
d.fig("dashprod", os.path.join(E, "app_prod_02_dashboard.png"), "Panel principal del ambiente Producción. Saldo $ 55.000,00, con movimientos distintos a los de QA.", max_width_in=6.4)
d.pf("Esta es la evidencia más importante del laboratorio: el mismo usuario ve dos saldos diferentes según el ambiente en el que entre. La Figura {comparativa} lo muestra lado a lado.", "comparativa")
d.fig("comparativa", os.path.join(E, "ev_07_comparativa.png"), "Comparativa de QA y Producción con el mismo usuario. Los saldos y los movimientos son distintos en cada ambiente, lo que confirma la separación de las bases de datos.", max_width_in=6.9)

d.h("5.3. Operación realizada contra la base de datos", 2)
d.p("Se demuestra una transferencia, que es la operación que mueve saldo entre dos billeteras dentro de una sola transacción. Primero se llena el formulario en la interfaz.")
d.fig("form", os.path.join(E, "app_qa_04_transferir_formulario.png"), "Formulario de transferencia del ambiente QA, con el destinatario y el monto. Al confirmar, la operación escribe en la base walletucp_qa.", max_width_in=6.0)
d.p("El historial de transacciones muestra los movimientos resultantes:")
d.fig("historial", os.path.join(E, "app_qa_05_transacciones.png"), "Historial de transacciones del ambiente QA.", max_width_in=6.0)
d.p("Para comprobar en la base de datos que la operación realmente se guardó, se registran los saldos antes y después, y se repite la consulta sobre la base de Producción para demostrar que allí no cambió nada.")
d.fig("transaccion", os.path.join(E, "ev_06_transaccion.png"), "Evidencia de la transferencia real en la base de datos. En QA los saldos cambian (user1 y user2) y se generan los dos movimientos DEBIT y CREDIT. En Producción los saldos permanecen iguales y la referencia de la transferencia no existe: los ambientes son independientes.", max_width_in=6.2)
d.p("Esta figura es la demostración completa del requisito del laboratorio: una operación realizada en QA no llega a Producción, porque cada ambiente apunta a una base de datos distinta.")

d.h("5.4. Documentación de la API", 2)
d.p("Cada ambiente expone la documentación interactiva de su propio backend a través de NGINX, en /api-docs, porque cada server block hace proxy de esa ruta al backend de su ambiente.")
d.fig("swagger", os.path.join(E, "app_qa_06_swagger.png"), "Documentación Swagger del backend de QA, publicada en wallet-ucp-qa.local:8080/api-docs.", max_width_in=6.4)

d.h("Conclusión de los errores", 1)
d.p("Durante el laboratorio me salieron algunos errores que al principio no entendía, pero con cada uno aprendí algo nuevo. Estos son los reales que tuve que resolver en este proyecto.")

d.p("El primero fue vite: not found en el job build.", b=True, space_before=140)
d.p("El build fallaba justo antes de generar el bundle, con el error vite: not found. Lo primero que pensé era que faltaban dependencias, pero npm ci se estaba ejecutando bien. El problema estaba en que yo había puesto NODE_ENV=production a nivel de todo el workflow, y con esa variable npm omite las devDependencies, que es justamente donde vive Vite. Lo que me confundió más es que el paso de instalación terminaba con éxito igualmente: npm instala lo que puede y no avisa. Lo resolví quitando NODE_ENV del nivel global y definiéndolo job por job, y agregué un paso que verifica que el ejecutable de Vite exista antes de compilar, para que un error así se reportara en su origen y no tres pasos más adelante.")

d.p("El segundo error fue el job test muriendo con código 127.", b=True, space_before=140)
d.p("El job se detenía antes de llegar a las pruebas. El código 127 en Linux significa comando no encontrado, y la causa era que yo había agregado un paso que aplicaba el esquema de la base de datos con psql, pero psql no viene instalado en la imagen ubuntu-latest de GitHub Actions. Lo resolví borrando ese paso: el proyecto ya tiene un globalSetup en los tests de integración que crea la base de datos si no existe y aplica el mismo archivo de migración, que es idempotente. Ese paso solo duplicaba trabajo y lo que añadía era un punto de falla. Con eso aprendí que a veces la mejor corrección es borrar código en vez de arreglarlo.")

d.p("El tercero fue que el escaneo de secretos bloqueaba todos los pushes a main.", b=True, space_before=140)
d.p("El job de seguridad fallaba en cada push a la rama principal y no encontraba ningún secreto real. El mensaje era BASE and HEAD commits are the same. TruffleHog won't scan anything. La causa era que el escaneo comparaba la rama base por defecto contra el commit actual, y cuando el push era justo a la rama principal ambos eran el mismo commit y el rango quedaba vacío. Lo resolví indicando el rango explícito de los commits que introduce ese push (HEAD~1 a HEAD), que nunca está vacío. Aprendí que una herramienta de seguridad mal configurada es igual de problemática como una sin configurar: puede bloquear el proyecto entero y enseñar a ignorar sus propias alertas.")

d.p("El cuarto error fueron los permisos en /var/www/html.", b=True, space_before=140)
d.p("El job de despliegue fallaba al no poder crear ni borrar las carpetas de publicación. El self-hosted runner corre con el usuario github-runner, sin privilegios de superusuario, y /var/www/html es propiedad de root. Mi primer impulso fue cambiarle el propietario a root con chown, pero eso habría afectado también a los sitios de otros proyectos que viven en esa misma carpeta. Lo correcto, y lo que terminé haciendo, fue dar permisos solo al usuario del runner con una ACL: setfacl -m u:github-runner:rwx /var/www/html. Así cada proyecto sigue teniendo lo suyo y el runner puede trabajar solo donde necesita.")

d.pf("También me di cuenta de lo útil que es tener QA antes que producción: si algo sale mal, se ve primero en pruebas y no le llega al usuario final. Durante el laboratorio, tres de los cuatro errores anteriores se detectaron en el ambiente de QA, cuando un usuario todavía no dependía de ellos. Ese es el valor real de separar los dos ambientes con sus propias bases de datos, y la Figura {transaccion} lo deja claro con números.", "transaccion")

d.p("Finalmente, me llevo una idea que me pareció la más importante del proyecto: en una aplicación que maneja dinero no basta con que el código parezca correcto, hay que demostrarlo. El proyecto no se limita a afirmar que sus operaciones son atómicas: incluye pruebas que fuerzan un fallo en mitad de una transferencia y comprueban, con consultas directas a la base de datos, que el saldo, la transacción y el movimiento volvieron exactamente a su estado anterior. Esa es la diferencia entre decir que algo funciona y probarlo.")

d.h("Anexo. Comandos para reproducir el ambiente", 1)
d.p("Comandos usados para levantar el proyecto y ejecutar las pruebas:")
d.code("$ docker compose up -d --build          # PostgreSQL, backend y frontend\n$ curl http://localhost:5000/health      # estado de la API\n$ open http://localhost:8081              # revisar QA (sin editar /etc/hosts)\n$ open http://localhost:8082              # revisar Produccion\n$ docker compose down                    # detener todo")
d.p("Pruebas del backend:")
d.code("$ cd backend\n$ npx jest --selectProjects unit         # solo unitarios, sin base de datos\n$ npm test                                # unitarios e integracion")
d.p("Las capturas de la aplicación de este documento se generaron automáticamente con Playwright:")
d.code("$ cd frontend && npm i -D playwright\n$ npx playwright install chromium\n$ node capture_app.mjs")

path = d.save(OUT, title="Laboratorio 2 - Despliegue CI/CD - WalletUCP")
print(f"OK  {path}")
print(f"    {os.path.getsize(path):,} bytes | {len(d.images)} imagenes incrustadas")
