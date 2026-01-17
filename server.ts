import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import configuration from "./configuration.js";
import { initializeAppEnvironment, closeAppEnvironment } from "./src/config/index.js";
import { swaggerSpec } from "./src/config/swagger.js";
import routes from "./src/route/index.js";
import { AppError } from "./src/common/utils/AppError.js";

const app = express();

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);
            if (allowedOrigins.length === 0) return cb(null, true);
            return allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error("CORS not allowed"));
        },
        credentials: true,
    })
);

if (configuration.NODE_ENV !== "production") {
    app.use(morgan("dev"));
} else {
    app.use(morgan("combined"));
}



app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.get("/ready", (_req, res) => res.status(200).json({ ready: true }));

app.use("/api/v1", routes);

app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: "Route not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err instanceof AppError ? err.message :
        configuration.NODE_ENV === "production" ? "Something went wrong!" : String(err);
    console.error(err);
    res.status(statusCode).json({ success: false, message });
});

let server: ReturnType<typeof app.listen> | null = null;
let cleanup: (() => Promise<void>) | null = null;

async function start() {
    try {
        const envInitResult = await initializeAppEnvironment();
        cleanup =
            envInitResult && typeof (envInitResult as any).close === "function"
                ? async () => (envInitResult as any).close()
                : typeof closeAppEnvironment === "function"
                    ? closeAppEnvironment
                    : null;

        const port = Number(configuration.PORT) || 3000;
        server = app.listen(port, "0.0.0.0", () => {
            console.log(`Server running at http://${configuration.HOST || "0.0.0.0"}:${port}`);
        });

        const graceful = async (signal?: string) => {
            console.info(`Shutting down${signal ? " (" + signal + ")" : ""}...`);
            if (server) {
                server.close(() => {
                    console.log("HTTP server closed");
                });
            }
            try {
                if (cleanup) await cleanup();
            } catch (e) {
                console.error("Error during cleanup:", e);
            } finally {
                process.exit(0);
            }
        };

        process.on("SIGTERM", () => graceful("SIGTERM"));
        process.on("SIGINT", () => graceful("SIGINT"));
        process.on("uncaughtException", (err) => {
            console.error("Uncaught exception:", err);
            graceful("uncaughtException");
        });
        process.on("unhandledRejection", (reason) => {
            console.error("Unhandled rejection:", reason);
            graceful("unhandledRejection");
        });
    } catch (error) {
        console.error("Failed to initialize dependencies:", error);
        process.exit(1);
    }
}

start();