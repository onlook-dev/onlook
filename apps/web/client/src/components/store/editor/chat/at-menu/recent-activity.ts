import type { AtMenuItem } from './types';

export interface RecentActivity {
  id: string;
  type: 'file' | 'tab';
  name: string;
  path: string;
  category: 'recents';
  icon: string;
  timestamp: number;
}

export class RecentActivityTracker {
  private static readonly STORAGE_KEY = 'onlook_recent_activity';
  private static readonly MAX_RECENT_ITEMS = 10; // Keep more in storage, but only show 3 in UI

  static addFileActivity(filePath: string, fileName: string, icon: string): void {
    try {
      const activity: RecentActivity = {
        id: `file-${filePath}`,
        type: 'file',
        name: fileName,
        path: filePath,
        category: 'recents',
        icon,
        timestamp: Date.now()
      };
      
      this.addActivity(activity);
    } catch (error) {
      console.error('Error adding file activity:', error);
    }
  }

  static addTabActivity(tabName: string, tabPath: string, icon: string): void {
    try {
      const activity: RecentActivity = {
        id: `tab-${tabPath}`,
        type: 'tab',
        name: tabName,
        path: tabPath,
        category: 'recents',
        icon,
        timestamp: Date.now()
      };
      
      this.addActivity(activity);
    } catch (error) {
      console.error('Error adding tab activity:', error);
    }
  }

  private static addActivity(newActivity: RecentActivity): void {
    try {
      const activities = this.getActivities();
      
      // Remove existing activity with same id to avoid duplicates
      const filteredActivities = activities.filter(activity => activity.id !== newActivity.id);
      
      // Add new activity at the beginning (most recent)
      const updatedActivities = [newActivity, ...filteredActivities];
      
      // Keep only the most recent items
      const limitedActivities = updatedActivities.slice(0, this.MAX_RECENT_ITEMS);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limitedActivities));
    } catch (error) {
      console.error('Error saving recent activity:', error);
    }
  }

  static getRecentItems(limit: number = 3): AtMenuItem[] {
    try {
      const activities = this.getActivities();
      
      // Return the most recent items, limited to the specified count
      return activities.slice(0, limit).map(activity => ({
        id: activity.id,
        type: activity.type,
        name: activity.name,
        path: activity.path,
        category: activity.category,
        icon: activity.icon
      }));
    } catch (error) {
      console.error('Error getting recent items:', error);
      return [];
    }
  }

  private static getActivities(): RecentActivity[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const activities = JSON.parse(stored) as RecentActivity[];
      
      // Validate and clean up the data
      return activities
        .filter(activity => 
          activity && 
          typeof activity === 'object' &&
          typeof activity.id === 'string' &&
          typeof activity.name === 'string' &&
          typeof activity.path === 'string' &&
          typeof activity.icon === 'string' &&
          typeof activity.timestamp === 'number'
        )
        .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp, newest first
    } catch (error) {
      console.error('Error parsing recent activities:', error);
      return [];
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing recent activities:', error);
    }
  }
} 