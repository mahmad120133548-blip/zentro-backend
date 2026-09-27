import prisma from "../config/prisma.js";

const categories = [
  {
    name: "Electronics",
    slug: "electronics",
    image: "/categories/electronics.jpg",
  },
  {
    name: "Fashion",
    slug: "fashion",
    image: "/categories/fashion.jpg",
  },
  {
    name: "Groceries",
    slug: "groceries",
    image: "/categories/groceries.jpg",
  },
  {
    name: "Home & Living",
    slug: "home-living",
    image: "/categories/homeliving.jpg",
  },
  {
    name: "Beauty & Personal",
    slug: "beauty",
    image: "/categories/beauty.jpg",
  },
  {
    name: "Sports & Fitness",
    slug: "sports",
    image: "/categories/sport.jpg",
  },
  {
    name: "Toys & Kids",
    slug: "toys",
    image: "/categories/toys.jpg",
  },
  {
    name: "Office & Stationery",
    slug: "office-stationery",
    image: "/categories/office.jpg",
  },
  {
    name: "Books",
    slug: "books",
    image: null,
  },
  {
    name: "Perfume",
    slug: "perfume",
    image: null,
  },
  {
    name: "Watches",
    slug: "watches",
    image: null,
  },
  {
    name: "Accessories",
    slug: "accessories",
    image: null,
  },
];

for (const category of categories) {
  await prisma.category.upsert({
    where: {
      slug: category.slug,
    },
    update: {
      name: category.name,
      image: category.image,
    },
    create: {
      name: category.name,
      slug: category.slug,
      image: category.image,
    },
  });
}