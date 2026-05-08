const express = require('express')
const router = express.Router()
const Address = require('../models/Address')
const { authMiddleware } = require('../middleware/auth')

// Get all addresses for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.userId }).sort({ createdAt: -1 })
    res.json({
      success: true,
      data: addresses,
      message: 'Addresses fetched successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// Get single address
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.userId })
    
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      })
    }

    res.json({
      success: true,
      data: address
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// Create new address
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { fullName, phoneNumber, email, houseNo, area, landmark, city, state, country, pincode, addressType, isDefault } = req.body

    // Validate required fields
    if (!fullName || !phoneNumber || !email || !houseNo || !area || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      })
    }

    // If this is default, unset default on other addresses
    if (isDefault) {
      await Address.updateMany(
        { userId: req.userId },
        { isDefault: false }
      )
    }

    const address = new Address({
      userId: req.userId,
      fullName,
      phoneNumber,
      email,
      houseNo,
      area,
      landmark: landmark || '',
      city,
      state,
      country: country || 'India',
      pincode,
      addressType: addressType || 'Home',
      isDefault: isDefault || false
    })

    await address.save()

    res.status(201).json({
      success: true,
      data: address,
      message: 'Address added successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// Update address
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { fullName, phoneNumber, email, houseNo, area, landmark, city, state, country, pincode, addressType, isDefault } = req.body

    // Check if address exists and belongs to user
    const address = await Address.findOne({ _id: req.params.id, userId: req.userId })
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      })
    }

    // If this is default, unset default on other addresses
    if (isDefault) {
      await Address.updateMany(
        { userId: req.userId, _id: { $ne: req.params.id } },
        { isDefault: false }
      )
    }

    // Update address
    Object.assign(address, {
      fullName: fullName || address.fullName,
      phoneNumber: phoneNumber || address.phoneNumber,
      email: email || address.email,
      houseNo: houseNo || address.houseNo,
      area: area || address.area,
      landmark: landmark !== undefined ? landmark : address.landmark,
      city: city || address.city,
      state: state || address.state,
      country: country || address.country,
      pincode: pincode || address.pincode,
      addressType: addressType || address.addressType,
      isDefault: isDefault !== undefined ? isDefault : address.isDefault
    })

    await address.save()

    res.json({
      success: true,
      data: address,
      message: 'Address updated successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// Delete address
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({ _id: req.params.id, userId: req.userId })

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      })
    }

    res.json({
      success: true,
      message: 'Address deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// Set address as default
router.put('/:id/default', authMiddleware, async (req, res) => {
  try {
    // Unset default on all addresses
    await Address.updateMany(
      { userId: req.userId },
      { isDefault: false }
    )

    // Set this address as default
    const address = await Address.findByIdAndUpdate(
      req.params.id,
      { isDefault: true },
      { new: true }
    )

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      })
    }

    res.json({
      success: true,
      data: address,
      message: 'Default address updated'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

module.exports = router
