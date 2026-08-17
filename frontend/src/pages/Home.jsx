import Navbar from "../components/Layout/Navbar";
import Hero from "../components/Home/Hero";
import Products from "../components/Home/Products";
import WhyZynora from "../components/Home/WhyZynora";
import HowItWorks from "../components/Home/HowItWorks";
import Footer from "../components/Layout/Footer";

function Home() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <Products />
        <WhyZynora />
        <HowItWorks />
      </main>

      <Footer />
    </>
  );
}

export default Home;