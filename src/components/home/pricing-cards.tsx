"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Check, Gem, Star } from "lucide-react";
import Link from "next/link";

const plans = [
    {
        title: "Standard Pro Plan",
        description: "Full access for one year.",
        price: "from ₹499",
        validUntil: "Full 1-Year Access",
        features: [
            "MTS Plan: ₹499/year",
            "Postman Plan: ₹599/year",
            "PA Plan: ₹799/year",
            "All Pro features included",
        ],
        icon: Gem,
        iconClass: "text-primary",
        isFeatured: true, // Make this the featured plan now
    }
];

export function PricingCards() {
    return (
        <div className="space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Choose Your Plan</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Select the best plan to supercharge your exam preparation. All plans unlock unlimited access to our premium features.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto justify-center">
                {plans.map((plan) => (
                    <Card key={plan.title} className={`flex flex-col md:col-start-1 md:col-span-2 lg:col-start-auto lg:col-span-1 ${plan.isFeatured ? 'border-primary border-2 shadow-lg' : ''}`}>
                        <CardHeader className="text-center">
                            <div className={`mx-auto bg-primary/10 p-4 rounded-full w-fit ${plan.isFeatured ? 'bg-amber-400/10' : ''}`}>
                                <plan.icon className={`h-8 w-8 ${plan.iconClass}`} />
                            </div>
                            <CardTitle className="text-2xl pt-4">{plan.title}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col items-center space-y-4">
                            <div className="text-4xl font-bold">
                                {plan.price}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{plan.validUntil}</span>
                            </div>
                            <ul className="space-y-2 text-muted-foreground text-sm pt-4 w-full">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2">
                                        <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full" size="lg">
                                <Link href="/auth/register">Get Started</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
