const products = [
  {
    icon: "🏠",
    title: "AI House Designer",
    description:
      "Generate personalized home layouts based on your plot, lifestyle, room requirements, and design preferences.",
  },
  {
    icon: "📐",
    title: "Plan Visualizer",
    description:
      "Upload an existing floor plan and transform it into an interactive 3D visualization without changing the layout.",
  },
  {
    icon: "🎨",
    title: "Interior & Exterior Studio",
    description:
      "Explore interior styles, materials, colors, furniture arrangements, and exterior design options.",
  },
];

function Products() {
  return (
    <section className="productsSection" id="products">
      <div className="sectionHeader">
        <p className="sectionEyebrow">OUR PRODUCTS</p>
        <h2>Everything you need to design your home</h2>
        <p>
          From the first idea to the final visualization, Zynora helps you
          design smarter and make better decisions.
        </p>
      </div>

      <div className="productGrid">
        {products.map((product) => (
          <article className="productCard" key={product.title}>
            <div className="productIcon" aria-hidden="true">
              {product.icon}
            </div>

            <h3>{product.title}</h3>
            <p>{product.description}</p>

            <button className="productLink" type="button">
              Explore Product →
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Products;