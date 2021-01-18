const router = require('express').Router();

router.get('/', (req, res, next)=>{
    res.render('index', {title: 'Ochess'});
})




module.exports = router;