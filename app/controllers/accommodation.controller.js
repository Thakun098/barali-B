const db = require("../models/");
const { Op } = require("sequelize")
const Accommodation = db.accommodation;
const Type = db.type;
const Booking = db.booking;

exports.getAll = async (req, res) => {
    try {
        const accommodation = await Accommodation.findAll({
            include: [
                {
                    model: Type,
                    attributes: ["name"]
                },
            ],
        });
        console.log(accommodation)
        res.status(200).json(accommodation)


    } catch (error) {
        res.status(500).json({ message: "Error fetching Accommodations" })
    }
}

exports.getPromotion = async (req, res) => {
    try {
        const promotion = await Accommodation.findAll({
            where: {
                discount: {
                    [Op.ne]: null
                }
            },
            include: [
                {
                    model: Type,
                    attributes: ["name"]
                }
            ]

        })
        res.status(200).json(promotion)


    } catch (error) {
        res.status(500).json({ message: "Error fetching Promotions" })
    }
}

exports.getPopularAccommodation = async (req, res) => {
    try {
        const limitNum = 4;
        const minRatingNum = 4;

        const accommodation = await Accommodation.findAll({
            include: [
                {
                    model: Type,
                    attributes: ["name"]
                },
                {
                    model: Booking,
                    attributes: ["id", "checkOutRating", "checkInDate", "checkOutDate"],
                }
            ],
        });

        //คำนวน 1.คะแนนเฉลี่ย และ 2. จำนวนการจอง
        const popularAccommodation = accommodation.map(item =>{
            const accommodationObject = item.toJSON();
            const bookings = accommodationObject.bookings || [];

            // คำนวนคะแนนเฉลี่ย 
            const validRatings = bookings
            .map(b => b.checkOutRating)
            .filter(rating => rating !== null && rating !== undefined && typeof rating === 'number');
            
            const totalRating = validRatings.reduce((acc, rating) => acc + rating, 0); //reduce คือ การวนลูปรวมค่าคะแนนใน array เป็นการเอา Operator ไปกระทำใน Array 
            const countRating = validRatings.length;
            const averageRating = countRating > 0 ? totalRating / countRating : 0;
            const ratingPercentage = countRating > 0? (averageRating / 5) * 100 : 0;

            // คำนวนจำนวนการจองในช่วง 30 วันล่าสุด
            const now = new Date();
            const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

            const recentBookings = bookings.filter(b => {
                const bookingDate = new Date(b.checkInDate);
                return bookingDate >= thirtyDaysAgo;
            })

            // คำนวนคะแนนความนิยม (คะแนนรีวิว + การจอง)
            const popularityScore = (averageRating * 0.5) + (recentBookings.length  * 0.5);

            return {
                ...accommodationObject,
                averageRating: parseFloat(averageRating.toFixed(2)), // ปัดทศนิยม 2 ตำแหน่ง
                ratingPercentage: parseFloat(ratingPercentage.toFixed(2)), // ปัดทศนิยม 2 ตำแหน่ง
                countRating: countRating,
                countBookings: recentBookings.length,
                popularityScore: parseFloat(popularityScore.toFixed(2)), // ปัดทศนิยม 2 ตำแหน่ง
            }
        });
        const filteredAccommodation = popularAccommodation
        .filter(acc => acc.averageRating >= minRatingNum)
        .sort((a, b) => b.popularityScore - a.popularityScore) //เพื่อเรียงลำดับความนิยมจากมากไปน้อย
        .slice(0, limitNum); //เพื่อให้แสดงผลแค่ 4 ตัว
        
        // console.log(accommodation)
        res.status(200).json(filteredAccommodation);
}
    catch (error) {
        res.status(500).json({ message: "Error fetching Popular Accommodations" })
    }
}