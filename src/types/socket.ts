/**
 * Socket.ioイベントの型定義
 */

export interface ServerToClientEvents {
  'agent:position:update': (data: { agentId: string; lat: number; lng: number }) => void;
  'agent:state:update': (data: { agentId: string; state: string }) => void;
  'agent:message:received': (data: { from: string; to: string; message: string }) => void;
}

export interface ClientToServerEvents {
  'agent:position': (data: { agentId: string; lat: number; lng: number }) => void;
  'agent:state': (data: { agentId: string; state: string }) => void;
  'agent:message': (data: { from: string; to: string; message: string }) => void;
}

