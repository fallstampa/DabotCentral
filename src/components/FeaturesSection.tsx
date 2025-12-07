import { Card } from "@/components/ui/card";
import { Brain, Zap, Shield, Network } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Advanced Intelligence",
    description: "Powered by cutting-edge AI algorithms that learn and adapt to your needs in real-time.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Experience instant responses and real-time processing with our optimized infrastructure.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption and security protocols to keep your data safe and private.",
  },
  {
    icon: Network,
    title: "Seamless Integration",
    description: "Connect with your existing tools and workflows effortlessly through our API.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 px-4 relative">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Powerful Features
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to harness the power of AI-driven communication
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-6 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-all duration-300 hover:shadow-glow group animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
