exports.packages = [
  { title:'Starter', price:0.99, per:'Month', feature:5 },
  { title:'Basic', price:4.99, per:'Month', feature:100 },
  { title:'Business', price:9.99, per:'Month', feature:500 },
  { title:'Premium', price:14.99, per:'Month', feature:1000 },
  { title:'Platinum', price:19.99, per:'Month', feature:2000 },
  { title:'Gold', price:24.99, per:'Month', feature:5000 },
];

const Joi = require("joi");

exports.selectPlanSchema = Joi.object({
  title: Joi.string().required().valid(
    'Starter', 'Basic', 'Business',
    'Premium','Platinum','Gold'
  )
});
