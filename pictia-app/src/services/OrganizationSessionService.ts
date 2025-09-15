import AsyncStorage from '@react-native-async-storage/async-storage';

interface OrganizationSession {
  id: string;
  startTime: number;
  endTime?: number;
  startingPhotoId?: string;
  startMode: 'gallery' | 'natural';
  totalItems: number;
  processedItems: number;
  keepCount: number;
  deleteCount: number;
  isCommitted: boolean;
  pendingActions: Array<{
    mediaItemId: string;
    action: 'keep' | 'delete';
    timestamp: number;
  }>;
}

class OrganizationSessionService {
  private static readonly CURRENT_SESSION_KEY = 'organization_current_session';
  private static readonly SESSION_HISTORY_KEY = 'organization_session_history';
  private static readonly MAX_HISTORY_ITEMS = 50;

  /**
   * Save current session to persistent storage
   */
  static async saveCurrentSession(session: OrganizationSession): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.CURRENT_SESSION_KEY,
        JSON.stringify(session)
      );
    } catch (error) {
      console.error('Failed to save current session:', error);
      throw new Error('Failed to save session progress');
    }
  }

  /**
   * Load current session from persistent storage
   */
  static async loadCurrentSession(): Promise<OrganizationSession | null> {
    try {
      const sessionData = await AsyncStorage.getItem(this.CURRENT_SESSION_KEY);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData) as OrganizationSession;
      
      // Validate session data
      if (!this.isValidSession(session)) {
        console.warn('Invalid session data found, clearing...');
        await this.clearCurrentSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to load current session:', error);
      return null;
    }
  }

  /**
   * Clear current session from storage
   */
  static async clearCurrentSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CURRENT_SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear current session:', error);
    }
  }

  /**
   * Save session to history
   */
  static async saveToHistory(session: OrganizationSession): Promise<void> {
    try {
      const historyData = await AsyncStorage.getItem(this.SESSION_HISTORY_KEY);
      let history: OrganizationSession[] = historyData ? JSON.parse(historyData) : [];

      // Add new session to beginning of history
      history.unshift(session);

      // Keep only the most recent sessions
      if (history.length > this.MAX_HISTORY_ITEMS) {
        history = history.slice(0, this.MAX_HISTORY_ITEMS);
      }

      await AsyncStorage.setItem(
        this.SESSION_HISTORY_KEY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error('Failed to save session to history:', error);
    }
  }

  /**
   * Load session history
   */
  static async loadSessionHistory(): Promise<OrganizationSession[]> {
    try {
      const historyData = await AsyncStorage.getItem(this.SESSION_HISTORY_KEY);
      if (!historyData) return [];

      const history = JSON.parse(historyData) as OrganizationSession[];
      
      // Filter out invalid sessions
      return history.filter(session => this.isValidSession(session));
    } catch (error) {
      console.error('Failed to load session history:', error);
      return [];
    }
  }

  /**
   * Get session statistics
   */
  static async getSessionStatistics(): Promise<{
    totalSessions: number;
    totalPhotosProcessed: number;
    totalPhotosKept: number;
    totalPhotosDeleted: number;
    averageSessionDuration: number;
    lastSessionDate?: number;
  }> {
    try {
      const history = await this.loadSessionHistory();
      const completedSessions = history.filter(session => session.isCommitted);

      if (completedSessions.length === 0) {
        return {
          totalSessions: 0,
          totalPhotosProcessed: 0,
          totalPhotosKept: 0,
          totalPhotosDeleted: 0,
          averageSessionDuration: 0,
        };
      }

      const totalPhotosProcessed = completedSessions.reduce(
        (sum, session) => sum + session.processedItems, 0
      );
      const totalPhotosKept = completedSessions.reduce(
        (sum, session) => sum + session.keepCount, 0
      );
      const totalPhotosDeleted = completedSessions.reduce(
        (sum, session) => sum + session.deleteCount, 0
      );
      const totalDuration = completedSessions.reduce(
        (sum, session) => sum + ((session.endTime || session.startTime) - session.startTime), 0
      );

      const lastSessionDate = completedSessions[0]?.endTime || completedSessions[0]?.startTime;
      
      return {
        totalSessions: completedSessions.length,
        totalPhotosProcessed,
        totalPhotosKept,
        totalPhotosDeleted,
        averageSessionDuration: totalDuration / completedSessions.length,
        ...(lastSessionDate && { lastSessionDate }),
      };
    } catch (error) {
      console.error('Failed to get session statistics:', error);
      return {
        totalSessions: 0,
        totalPhotosProcessed: 0,
        totalPhotosKept: 0,
        totalPhotosDeleted: 0,
        averageSessionDuration: 0,
      };
    }
  }

  /**
   * Clear all session data (for reset/logout)
   */
  static async clearAllSessionData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.CURRENT_SESSION_KEY),
        AsyncStorage.removeItem(this.SESSION_HISTORY_KEY),
      ]);
    } catch (error) {
      console.error('Failed to clear session data:', error);
    }
  }

  /**
   * Check if session has expired (older than 24 hours)
   */
  static isSessionExpired(session: OrganizationSession): boolean {
    const now = Date.now();
    const sessionAge = now - session.startTime;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return sessionAge > maxAge;
  }

  /**
   * Validate session data structure
   */
  private static isValidSession(session: any): session is OrganizationSession {
    return (
      session &&
      typeof session.id === 'string' &&
      typeof session.startTime === 'number' &&
      (session.startMode === 'gallery' || session.startMode === 'natural') &&
      typeof session.totalItems === 'number' &&
      typeof session.processedItems === 'number' &&
      typeof session.keepCount === 'number' &&
      typeof session.deleteCount === 'number' &&
      typeof session.isCommitted === 'boolean' &&
      Array.isArray(session.pendingActions)
    );
  }

  /**
   * Get smart photo ordering based on session mode
   */
  static getPhotoOrdering(
    allPhotos: any[],
    startMode: 'gallery' | 'natural',
    startingPhotoId?: string
  ): any[] {
    if (startMode === 'gallery' && startingPhotoId) {
      // Start from selected photo and continue to most recent
      const startIndex = allPhotos.findIndex(photo => photo.id === startingPhotoId);
      if (startIndex >= 0) {
        return [
          ...allPhotos.slice(startIndex),
          ...allPhotos.slice(0, startIndex)
        ];
      }
    }

    // Natural mode: show unreviewed photos from oldest to most recent
    const unreviewed = allPhotos.filter(photo => 
      !photo.organizationStatus || 
      photo.organizationStatus === 'pending'
    );

    // Sort by creation time (oldest first)
    return unreviewed.sort((a, b) => {
      const timeA = new Date(a.mediaMetadata.creationTime).getTime();
      const timeB = new Date(b.mediaMetadata.creationTime).getTime();
      return timeA - timeB;
    });
  }
}

export default OrganizationSessionService;