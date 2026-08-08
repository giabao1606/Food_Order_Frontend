import axiosClient from './axiosClient';

export const uploadImageToServer = async (file, folderName = 'general') => {
    if (!file) return null;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folderName', folderName);
    
    try {
        const response = await axiosClient.post('/upload/image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        if (response.success) {
            return response.url;
        }
        throw new Error(response.message || 'Lỗi tải ảnh lên máy chủ');
    } catch (error) {
        console.error('Lỗi upload ảnh:', error);
        throw error;
    }
};
