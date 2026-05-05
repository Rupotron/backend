# Partner App - Geo Matching Integration Guide

This guide explains how to integrate the partner app with the Redis-based geo matching system.

## Overview

The partner app needs to:
1. Send real-time location updates when online
2. Sync metrics when status changes
3. Handle location permissions
4. Respect battery/data usage

## 1. Location Tracking

### Setup Location Permission Handler

```typescript
// partner_app/src/lib/location.ts
import * as Location from 'expo-location';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Location permission request failed:', error);
    return false;
  }
};

export const startLocationTracking = async (
  onLocationUpdate: (location: LocationCoordinates) => void,
  intervalMs: number = 20000 // 20 seconds
): Promise<Location.LocationSubscription | null> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permissions not granted');
      return null;
    }

    // Set high accuracy for better matching
    return Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: intervalMs,
        distanceInterval: 50, // Update every 50 meters
      },
      (location) => {
        onLocationUpdate({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
          timestamp: location.timestamp,
        });
      }
    );
  } catch (error) {
    console.error('Location tracking setup failed:', error);
    return null;
  }
};

export const stopLocationTracking = async (
  subscription: Location.LocationSubscription | null
): Promise<void> => {
  if (subscription) {
    subscription.remove();
  }
};

export const getCurrentLocation = async (): Promise<LocationCoordinates | null> => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? undefined,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('Failed to get current location:', error);
    return null;
  }
};
```

### Create Location Service Hook

```typescript
// partner_app/src/hooks/useLocationTracking.ts
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/auth';
import * as locationLib from '@/lib/location';
import apiClient from '@/lib/apiClient';
import type { LocationCoordinates } from '@/lib/location';

export const useLocationTracking = (
  enabled: boolean,
  updateIntervalMs: number = 20000
) => {
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const pendingUpdateRef = useRef<boolean>(false);

  const sendLocationUpdate = useCallback(
    async (location: LocationCoordinates) => {
      if (!user?.id || pendingUpdateRef.current) return;

      try {
        pendingUpdateRef.current = true;

        await apiClient.post('/match/location', {
          partnerId: user.id,
          latitude: location.latitude,
          longitude: location.longitude,
          isOnline: true,
        });

        console.log('Location updated:', location);
      } catch (error) {
        console.error('Failed to update location:', error);
      } finally {
        pendingUpdateRef.current = false;
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (!enabled || !user?.id) {
      // Stop tracking
      if (subscriptionRef.current) {
        locationLib.stopLocationTracking(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      return;
    }

    const setupTracking = async () => {
      // Request permission
      const hasPermission = await locationLib.requestLocationPermission();
      if (!hasPermission) {
        console.warn('Location permission denied');
        return;
      }

      // Start tracking
      const subscription = await locationLib.startLocationTracking(
        sendLocationUpdate,
        updateIntervalMs
      );

      subscriptionRef.current = subscription;

      // Get initial location
      const location = await locationLib.getCurrentLocation();
      if (location) {
        await sendLocationUpdate(location);
      }
    };

    setupTracking();

    return () => {
      if (subscriptionRef.current) {
        locationLib.stopLocationTracking(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [enabled, user?.id, updateIntervalMs, sendLocationUpdate]);

  return {
    isTracking: !!subscriptionRef.current,
  };
};
```

## 2. Integrate into Partner Home Screen

```typescript
// partner_app/src/app/home.tsx
import { useEffect, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { useSocket } from '@/hooks/useSocket';

export default function HomeScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const { socket } = useSocket();
  const { isTracking } = useLocationTracking(isOnline);

  const handleToggleOnline = async (value: boolean) => {
    try {
      if (value) {
        // Going online - emit socket event and start location tracking
        socket?.emit('partner:online', {
          partnerId: user?.id,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Going offline - stop location tracking and notify backend
        socket?.emit('partner:offline', {
          partnerId: user?.id,
          timestamp: new Date().toISOString(),
        });

        // Send one final offline location update
        await apiClient.post('/match/location', {
          partnerId: user?.id,
          latitude: lastLocation?.latitude,
          longitude: lastLocation?.longitude,
          isOnline: false,
        });
      }

      setIsOnline(value);
    } catch (error) {
      console.error('Failed to toggle online status:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusCard}>
        <View style={styles.statusContent}>
          <Text style={styles.label}>Go Online</Text>
          <Text style={styles.description}>
            {isOnline ? '📍 Location tracking active' : 'Tap to start accepting jobs'}
          </Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={handleToggleOnline}
          trackColor={{ false: '#767577', true: '#81c784' }}
          thumbColor={isOnline ? '#4caf50' : '#f1f3f4'}
        />
      </View>

      {isOnline && (
        <View style={styles.trackingStatus}>
          <Text style={styles.trackingText}>
            ✓ Sharing live location with backend
          </Text>
        </View>
      )}
    </View>
  );
}
```

## 3. Socket Event Handlers

Add these handlers to track online/offline status:

```typescript
// partner_app/src/hooks/useSocket.ts - Add to existing hook
export const useSocket = () => {
  const { user } = useAuth();
  const socket = useSocketIO();
  const apiClient = useApiClient();

  useEffect(() => {
    if (!socket || !user?.id) return;

    // Handle online status
    const handlePartnerOnline = async () => {
      try {
        // Notify matching system
        await apiClient.post('/match/sync-metrics', {
          partnerId: user.id,
        });
        console.log('Metrics synced on online');
      } catch (error) {
        console.error('Failed to sync metrics:', error);
      }
    };

    // Handle offline status
    const handlePartnerOffline = async () => {
      try {
        // Could sync metrics one last time if needed
        console.log('Partner went offline');
      } catch (error) {
        console.error('Failed to handle offline:', error);
      }
    };

    socket.on('partner:online', handlePartnerOnline);
    socket.on('partner:offline', handlePartnerOffline);

    return () => {
      socket.off('partner:online', handlePartnerOnline);
      socket.off('partner:offline', handlePartnerOffline);
    };
  }, [socket, user?.id]);

  return { socket };
};
```

## 4. Optimize for Battery/Data

```typescript
// partner_app/src/lib/locationOptimization.ts

interface LocationOptimizationConfig {
  updateIntervalMs: number;
  minDistanceMeters: number;
  // Adaptive based on network type
}

export const getOptimalLocationConfig = (
  networkType: 'wifi' | '4g' | '3g' | 'unknown'
): LocationOptimizationConfig => {
  const configs: Record<string, LocationOptimizationConfig> = {
    wifi: {
      updateIntervalMs: 10000, // 10 seconds
      minDistanceMeters: 30,
    },
    '4g': {
      updateIntervalMs: 15000, // 15 seconds
      minDistanceMeters: 50,
    },
    '3g': {
      updateIntervalMs: 30000, // 30 seconds
      minDistanceMeters: 100,
    },
    unknown: {
      updateIntervalMs: 20000, // 20 seconds (safe default)
      minDistanceMeters: 50,
    },
  };

  return configs[networkType] || configs.unknown;
};

// Batch location updates to reduce API calls
export class LocationBatcher {
  private locations: LocationCoordinates[] = [];
  private batchSize = 5;
  private timeoutMs = 30000; // 30 seconds
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    private onBatchReady: (locations: LocationCoordinates[]) => void
  ) {}

  addLocation(location: LocationCoordinates) {
    this.locations.push(location);

    if (this.locations.length >= this.batchSize) {
      this.flush();
    } else {
      this.resetTimeout();
    }
  }

  private resetTimeout() {
    if (this.timeoutId) clearTimeout(this.timeoutId);

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.timeoutMs);
  }

  private flush() {
    if (this.locations.length === 0) return;

    this.onBatchReady([...this.locations]);
    this.locations = [];

    if (this.timeoutId) clearTimeout(this.timeoutId);
  }

  destroy() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.locations = [];
  }
}
```

## 5. Performance Checklist

- [ ] Location permission requested before tracking
- [ ] Location updates sent every 15-30 seconds
- [ ] Location tracking stops when partner goes offline
- [ ] Updates batched when network is slow
- [ ] Error handling for failed updates
- [ ] Graceful degradation if location unavailable
- [ ] Metrics synced on status changes
- [ ] Memory leaks prevented (cleanup subscriptions)
- [ ] Battery optimization considered
- [ ] Data usage monitored

## 6. Testing

```typescript
// Test location updates
import { render, waitFor } from '@testing-library/react-native';
import HomeScreen from '@/app/home';

describe('Location Tracking', () => {
  it('should send location updates when online', async () => {
    const { getByTestId } = render(<HomeScreen />);
    
    const toggle = getByTestId('online-toggle');
    fireEvent.press(toggle);

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/match/location', expect.any(Object));
    });
  });

  it('should stop sending location when offline', async () => {
    // Test implementation
  });
});
```

## API Integration Summary

| Action | Endpoint | Frequency | Required |
|--------|----------|-----------|----------|
| Location Update | `POST /match/location` | Every 15-30s | Yes, when online |
| Metrics Sync | `POST /match/sync-metrics` | On status change | Yes, when coming online |
| Match Request | `POST /match/v2` | On demand | User action |

This integration ensures the Redis matching engine has accurate, real-time partner data for optimal matching results.
