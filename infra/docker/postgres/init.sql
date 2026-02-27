-- ==============================================================================
-- PostgreSQL Initialization Script
-- Creates the database and enables required extensions
-- Runs only on first container start (when data volume is empty)
-- ==============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search (used in log filtering)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
