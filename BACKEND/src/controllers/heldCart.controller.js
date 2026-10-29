import * as heldCartService from '../services/heldCart.service.js';
import catchAsync from '../utils/catchAsync.js';

export const getHeldCarts = catchAsync(async (req, res) => {
    const carts = await heldCartService.getHeldCarts(req.user._id);
    res.status(200).json({ data: carts });
});

export const createHeldCart = catchAsync(async (req, res) => {
    const cart = await heldCartService.createHeldCart(req.user._id, req.body);
    res.status(201).json(cart);
});

export const deleteHeldCart = catchAsync(async (req, res) => {
    await heldCartService.deleteHeldCart(req.params.id, req.user._id);
    res.status(204).send();
});