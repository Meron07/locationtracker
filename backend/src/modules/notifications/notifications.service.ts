import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /**
   * Send a push notification to a single device (by FCM token).
   * Returns the FCM message ID on success, null on failure.
   */
  async sendToDevice(fcmToken: string, payload: PushPayload): Promise<string | null> {
    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'safecircle_default',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
          headers: {
            'apns-priority': '10',
          },
        },
      };

      const result = await admin.messaging().send(message);
      return result;
    } catch (err) {
      this.logger.warn(`FCM send failed for token ${fcmToken.slice(0, 8)}…: ${err.message}`);
      return null;
    }
  }

  /**
   * Send a notification to multiple devices at once (up to 500).
   * Silently drops invalid tokens.
   */
  async sendToDevices(fcmTokens: string[], payload: PushPayload): Promise<void> {
    if (!fcmTokens.length) return;

    const message: admin.messaging.MulticastMessage = {
      tokens: fcmTokens.slice(0, 500),
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: { priority: 'high' },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
        headers: { 'apns-priority': '10' },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      if (response.failureCount > 0) {
        this.logger.warn(`FCM multicast: ${response.failureCount} failures out of ${fcmTokens.length} tokens`);
      }
    } catch (err) {
      this.logger.error(`FCM multicast failed: ${err.message}`);
    }
  }

  // ── Typed notification helpers ────────────────────────────────────────────

  async sendShareRequest(
    receiverToken: string,
    requesterName: string,
    shareId: string,
  ) {
    return this.sendToDevice(receiverToken, {
      title: `${requesterName} wants to share location`,
      body: 'Tap to review and respond.',
      data: { type: 'share_request', share_id: shareId },
    });
  }

  async sendGeofenceAlert(
    tokens: string[],
    personName: string,
    fence: string,
    trigger: 'enter' | 'exit',
  ) {
    return this.sendToDevices(tokens, {
      title: trigger === 'enter' ? `${personName} arrived at ${fence}` : `${personName} left ${fence}`,
      body: 'Tap to view on the map.',
      data: { type: 'geofence_alert', fence_name: fence, trigger },
    });
  }

  async sendSosAlert(
    initiatorId: string,
    sessionId: string,
    location: { lat: number | null; lng: number | null; message: string | null },
  ) {
    // Caller (SosService) is responsible for resolving FCM tokens of contacts.
    // This method is a placeholder used when SosService passes them in.
    this.logger.log(`SOS alert fired for user ${initiatorId}, session ${sessionId}`);
    // In a full implementation, SosService would pass contact tokens here.
    // The method is kept here as the canonical place to send SOS pushes.
  }

  async sendSosAlertToTokens(
    tokens: string[],
    initiatorName: string,
    sessionId: string,
  ) {
    return this.sendToDevices(tokens, {
      title: `🆘 ${initiatorName} triggered an SOS`,
      body: 'They may need help. Tap to view their location.',
      data: {
        type: 'sos_alert',
        session_id: sessionId,
        priority: 'critical',
      },
    });
  }
}
