import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadPhotos,
  deletePhoto,
  setPhotoAsPrimary,
} from '../controllers/products.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', asyncHandler(listProducts));
router.get('/:id', asyncHandler(getProduct));
router.post('/', asyncHandler(createProduct));
router.put('/:id', asyncHandler(updateProduct));
router.delete('/:id', asyncHandler(deleteProduct));

// Fotos
router.post('/:id/photos', upload.array('photos', 10), asyncHandler(uploadPhotos));
router.delete('/:productId/photos/:photoId', asyncHandler(deletePhoto));
router.patch('/:productId/photos/:photoId/primary', asyncHandler(setPhotoAsPrimary));

export default router;
