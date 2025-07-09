/**
 * Global configuration loader for CaseThread.
 * Centralizes environment-variable parsing so we have a single source of truth.
 */

import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  parallel: {
    MAX_PARALLEL: parseInt(process.env.CT_MAX_PARALLEL || '4'),
    WORKER_MODEL: process.env.CT_WORKER_MODEL || 'gpt-3.5-turbo-0125',
    ENABLED_BY_DEFAULT: process.env.CT_PARALLEL_DEFAULT === 'true'
  }
}; 