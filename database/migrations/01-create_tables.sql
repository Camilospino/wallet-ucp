-- WalletUCP Database Schema
-- This script creates all tables for the academic virtual wallet system

-- Create usuarios table
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (estado IN ('ACTIVE', 'BLOCKED')),
    rol VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (rol IN ('USER', 'ADMIN')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create billeteras table
CREATE TABLE IF NOT EXISTS billeteras (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER UNIQUE NOT NULL,
    saldo NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (saldo >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (estado IN ('ACTIVE', 'BLOCKED', 'CLOSED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Create transacciones table
CREATE TABLE IF NOT EXISTS transacciones (
    id SERIAL PRIMARY KEY,
    referencia VARCHAR(50) UNIQUE NOT NULL,
    origen_wallet_id INTEGER,
    destino_wallet_id INTEGER,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('DEPOSIT', 'WITHDRAW', 'TRANSFER')),
    monto NUMERIC(15, 2) NOT NULL CHECK (monto > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (estado IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (origen_wallet_id) REFERENCES billeteras(id) ON DELETE SET NULL,
    FOREIGN KEY (destino_wallet_id) REFERENCES billeteras(id) ON DELETE SET NULL
);

-- Create movimientos table
CREATE TABLE IF NOT EXISTS movimientos (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL,
    transaction_id INTEGER NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('CREDIT', 'DEBIT')),
    monto NUMERIC(15, 2) NOT NULL CHECK (monto > 0),
    saldo_anterior NUMERIC(15, 2) NOT NULL,
    saldo_resultante NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES billeteras(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transacciones(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_movimientos_wallet_created ON movimientos(wallet_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transacciones_origen ON transacciones(origen_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_destino ON transacciones(destino_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_created ON transacciones(created_at);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_billeteras_estado ON billeteras(estado);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
-- DROP IF EXISTS keeps this migration idempotent so it can be re-run safely
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_billeteras_updated_at ON billeteras;
CREATE TRIGGER update_billeteras_updated_at BEFORE UPDATE ON billeteras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
