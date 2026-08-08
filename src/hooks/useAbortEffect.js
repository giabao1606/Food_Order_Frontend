import { useEffect, useRef } from 'react';

/**
 * useAbortEffect — Wrapper cho useEffect với AbortController tự động.
 *
 * Cách dùng:
 *   useAbortEffect((signal) => {
 *     axiosClient.get('/api/data', { signal }).then(setData);
 *   }, [dependency]);
 *
 * Khi component unmount hoặc dependency thay đổi, request cũ sẽ tự động bị hủy.
 * axiosClient đã được cấu hình để bỏ qua CanceledError một cách im lặng.
 */
const useAbortEffect = (effect, deps) => {
    useEffect(() => {
        const controller = new AbortController();
        effect(controller.signal);
        return () => {
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
};

export default useAbortEffect;
