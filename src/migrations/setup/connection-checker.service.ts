import { Injectable, Logger } from '@nestjs/common';
import { Database } from 'arangojs';
import settings from '../../settings';

@Injectable()
export class ConnectionCheckerService {
  private readonly logger = new Logger(ConnectionCheckerService.name);
  private db: Database;

  constructor() {
    this.db = new Database({
      url: settings.arango.url,
      databaseName: settings.arango.database,
      auth: {
        username: settings.arango.username,
        password: settings.arango.password,
      },
    });
  }

  async checkConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const cursor = await this.db.query('RETURN 1');
      await cursor.next();
      return { success: true, message: 'ArangoDB connection successful' };
    } catch (error) {
      return { success: false, message: `Failed to connect to ArangoDB: ${error.message}` };
    }
  }

  async checkDatabaseExists(): Promise<{ exists: boolean; message: string }> {
    try {
      const cursor = await this.db.query('RETURN 1');
      await cursor.next();
      return { exists: true, message: 'Database exists and is accessible' };
    } catch (error) {
      if (error.message.includes('database not found') || error.message.includes('404')) {
        return { exists: false, message: `Database '${settings.arango.database}' does not exist` };
      }
      throw error;
    }
  }

  async createDatabaseIfNotExists(): Promise<{ success: boolean; message: string }> {
    try {
      const checkResult = await this.checkDatabaseExists();
      if (checkResult.exists) {
        return { success: true, message: 'Database already exists' };
      }

      const systemDb = new Database({
        url: settings.arango.url,
        databaseName: '_system',
        auth: { username: settings.arango.username, password: settings.arango.password },
      });

      await systemDb.createDatabase(settings.arango.database);
      return { success: true, message: `Database '${settings.arango.database}' created successfully` };
    } catch (error) {
      return { success: false, message: `Failed to create database: ${error.message}` };
    }
  }
} 