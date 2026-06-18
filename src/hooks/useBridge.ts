import { useEffect, useCallback, useRef, useState } from 'react';
import { BridgeMessage, SlotData } from '../types/index';

// ── UNS data shapes (exported so components can import them) ──
export interface HandoffStep {
  name  : string;
  status: string;
  pct   : number;
}

export interface WorkflowStep {
  name  : string;
  status: string;
}

export interface HandoffData {
  workflowStatus: string;
  projectedDate : string | null;
  workflowUrl   : string;
  timelineSteps : HandoffStep[];
  workflowSteps : WorkflowStep[];
}

// ── Local callback types ──────────────────────────────────
type BridgeCallback   = (data: SlotData[])    => void;
type ErrorCallback    = (error: string)        => void;
type HandoffCallback  = (data: HandoffData)   => void;

interface UseBridgeReturn {
  requestBrickData: (
    deviceName: string,
    onData    : BridgeCallback,
    onError   : ErrorCallback
  ) => () => void;

  // single name used everywhere — both BrickTracking and BrickHandoffPanel
  requestUNSData: (
    deviceName: string,
    onData    : HandoffCallback,
    onError   : ErrorCallback
  ) => () => void;

  isBridgeReady: boolean;
}

export const useBridge = (): UseBridgeReturn => {
  const [isBridgeReady, setIsBridgeReady] = useState<boolean>(false);
  const isBridgeReadyRef                  = useRef<boolean>(false);

  const pendingRequests = useRef<
    Map<string, { onData: BridgeCallback | HandoffCallback; onError: ErrorCallback }>
  >(new Map());

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const msg = event.data as BridgeMessage;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'BRIDGE_READY':
          isBridgeReadyRef.current = true;
          setIsBridgeReady(true);
          break;

        case 'NSM_RESPONSE': {
          const pending = pendingRequests.current.get(msg.requestId);
          if (!pending) return;
          (pending.onData as BridgeCallback)(msg.payload as SlotData[]);
          pendingRequests.current.delete(msg.requestId);
          break;
        }

        case 'UNS_RESPONSE': {
          const pending = pendingRequests.current.get(msg.requestId);
          if (!pending) return;
          (pending.onData as HandoffCallback)(msg.payload as HandoffData);
          pendingRequests.current.delete(msg.requestId);
          break;
        }

        case 'BRIDGE_ERROR': {
          const pending = pendingRequests.current.get(msg.requestId);
          if (!pending) return;
          pending.onError(msg.payload as string);
          pendingRequests.current.delete(msg.requestId);
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // ── Ping TM bridge every 500 ms until ready (max 10 s) ──
    let attempts = 0;
    const interval = setInterval(() => {
      if (isBridgeReadyRef.current) { clearInterval(interval); return; }
      if (attempts >= 20)           { clearInterval(interval); return; }
      window.postMessage(
        { type: 'BRIDGE_PING', requestId: '', payload: null } as BridgeMessage,
        window.location.origin
      );
      attempts++;
    }, 500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, []);

  // ── NSM brick data ────────────────────────────────────────
  const requestBrickData = useCallback((
    deviceName: string,
    onData    : BridgeCallback,
    onError   : ErrorCallback
  ): (() => void) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    pendingRequests.current.set(requestId, { onData, onError });
    window.postMessage(
      { type: 'NSM_REQUEST', requestId, payload: { deviceName } } as BridgeMessage,
      window.location.origin
    );
    return () => { pendingRequests.current.delete(requestId); };
  }, []);

  // ── UNS handoff data ──────────────────────────────────────
  const requestUNSData = useCallback((
    deviceName: string,
    onData    : HandoffCallback,
    onError   : ErrorCallback
  ): (() => void) => {
    const requestId = `uns_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    pendingRequests.current.set(requestId, { onData, onError });
    window.postMessage(
      { type: 'UNS_REQUEST', requestId, payload: { deviceName } } as BridgeMessage,
      window.location.origin
    );
    return () => { pendingRequests.current.delete(requestId); };
  }, []);

  return { requestBrickData, requestUNSData, isBridgeReady };
};
