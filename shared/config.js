// 서버·클라이언트가 같이 쓰는 상수 모음 (바이옴, 청크, 속도, 안개 등)
export const CHUNK_SIZE = 32;            // 청크 한 변 (월드 단위)
export const VERTS = CHUNK_SIZE + 1;     // 청크 한 변의 버텍스 수 (경계 공유)
export const WORLD_RADIUS_CHUNKS = 500;  // 서버가 허용하는 청크 좌표 범위
export const SEA_LEVEL = 0;

export const VIEW_RADIUS = 6;            // 플레이어 주변 로드 반경 (청크 단위)
export const MAX_PENDING_REQUESTS = 8;   // 동시에 서버에 요청 중인 청크 수

export const FOG_FAR = (VIEW_RADIUS - 1.5) * CHUNK_SIZE;
export const FOG_NEAR = FOG_FAR * 0.4;
export const SKY_COLOR = 0x9ec8f0;

export const PLAYER_SPEED = 8;
export const NET_MOVE_HZ = 15;

export const BIOME = { WATER: 0, GRASS: 1, FOREST: 2, DESERT: 3, SNOW: 4, MOUNTAIN: 5 };
export const BIOME_NAME = ['물', '초원', '숲', '사막', '설원', '산'];
export const BIOME_SPEED = [0, 1.0, 0.85, 0.8, 0.7, 0.75];
export const BIOME_COLOR = [0x2d5f8a, 0x6aa84f, 0x2f6b3a, 0xe0c97a, 0xf2f6fa, 0x8a8a8a];