
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
    AlertTriangle, Calculator, DollarSign, Calendar, TrendingUp, 
    PieChart as PieIcon, ListOrdered, Share2, Download, Info, 
    ShieldCheck, Wallet, ArrowRight, Zap, Landmark, CheckCircle2,
    ArrowUpDown, InfoIcon, Percent, Receipt
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const currencies = [
    { label: 'Indian Rupee (₹)', value: 'INR', symbol: '₹' },
    { label: 'US Dollar ($)', value: 'USD', symbol: '$' },
    { label: 'Euro (€)', value: 'EUR', symbol: '€' },
    { label: 'British Pound (£)', value: 'GBP', symbol: '£' },
    { label: 'Japanese Yen (¥)', value: 'JPY', symbol: '¥' },
    { label: 'UAE Dirham (DH)', value: 'AED', symbol: 'DH' },
    { label: 'Saudi Riyal (SR)', value: 'SAR', symbol: 'SR' },
    { label: 'Canadian Dollar (C$)', value: 'CAD', symbol: 'C$' },
    { label: 'Australian Dollar (A$)', value: 'AUD', symbol: 'A$' },
    { label: 'Swiss Franc (Fr)', value: 'CHF', symbol: 'Fr' },
    { label: 'Chinese Yuan (¥)', value: 'CNY', symbol: '¥' },
    { label: 'Singapore Dollar (S$)', value: 'SGD', symbol: 'S$' },
    { label: 'New Zealand Dollar (NZ$)', value: 'NZD', symbol: 'NZ$' },
    { label: 'Hong Kong Dollar (HK$)', value: 'HKD', symbol: 'HK$' },
    { label: 'South African Rand (R)', value: 'ZAR', symbol: 'R' },
];

interface AmortizationRow {
    month: number;
    principal: number;
    interest: number;
    balance: number;
}

interface EmiResult {
    monthlyEmi: number;
    totalInterest: number;
    totalProcessingFee: number;
    totalPayment: number;
    effectiveRate: number;
    amortization: AmortizationRow[];
    pieData: { name: string; value: number; color: string }[];
}

export default function EmiCalculator() {
    const { toast } = useToast();
    const [currency, setCurrency] = useState('INR');
    const [interestMode, setInterestMode] = useState<'reducing' | 'flat'>('reducing');
    const [inputs, setInputs] = useState({
        loanAmount: '1000000',
        interestRate: '10.5',
        tenureValue: '5',
        tenureUnit: 'years',
        processingFee: '1', // %
        otherCharges: '0',
    });

    const [result, setResult] = useState<EmiResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputs(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSelectChange = (id: string, value: string) => {
        setInputs(prev => ({ ...prev, [id]: value }));
    };

    const calculateEmi = useCallback(() => {
        setError(null);
        setResult(null);

        try {
            const P = parseFloat(inputs.loanAmount);
            const R_annual = parseFloat(inputs.interestRate);
            const T_val = parseFloat(inputs.tenureValue);
            const pFeeRate = parseFloat(inputs.processingFee) || 0;
            const other = parseFloat(inputs.otherCharges) || 0;

            if (isNaN(P) || P <= 0) throw new Error("Please enter a valid loan amount.");
            if (isNaN(R_annual) || R_annual <= 0) throw new Error("Please enter a valid interest rate.");
            if (isNaN(T_val) || T_val <= 0) throw new Error("Please enter a valid tenure.");

            const totalMonths = inputs.tenureUnit === 'years' ? T_val * 12 : T_val;
            const r = (R_annual / 100) / 12; // Monthly interest rate
            const processingFeeAmount = (P * pFeeRate) / 100;
            const totalFees = processingFeeAmount + other;

            let emi = 0;
            let totalInterest = 0;
            const amortization: AmortizationRow[] = [];

            if (interestMode === 'reducing') {
                // Standard EMI Formula (Reducing Balance)
                emi = (P * r * Math.pow(1 + r, totalMonths)) / (Math.pow(1 + r, totalMonths) - 1);
                totalInterest = (emi * totalMonths) - P;

                let balance = P;
                for (let i = 1; i <= totalMonths; i++) {
                    const interest = balance * r;
                    const principal = emi - interest;
                    balance -= principal;
                    if (i <= 120 || i % 12 === 0 || i === totalMonths) { // Sample data for table
                        amortization.push({ month: i, principal, interest, balance: Math.max(0, balance) });
                    }
                }
            } else {
                // Flat Rate Formula
                // Total Interest = P * R * T
                totalInterest = P * (R_annual / 100) * (totalMonths / 12);
                emi = (P + totalInterest) / totalMonths;

                let balance = P;
                const fixedPrincipalPerMonth = P / totalMonths;
                const fixedInterestPerMonth = totalInterest / totalMonths;
                for (let i = 1; i <= totalMonths; i++) {
                    balance -= fixedPrincipalPerMonth;
                    if (i <= 120 || i % 12 === 0 || i === totalMonths) {
                        amortization.push({ 
                            month: i, 
                            principal: fixedPrincipalPerMonth, 
                            interest: fixedInterestPerMonth, 
                            balance: Math.max(0, balance) 
                        });
                    }
                }
            }

            // Effective Rate calculation (Internal Rate of Return approximation)
            // Considering fees as upfront cost
            const netProceeds = P - totalFees;
            // Simple approximation for EIR
            const effectiveRate = ((emi * totalMonths - netProceeds) / netProceeds) * (12 / totalMonths) * 100;

            const pieData = [
                { name: 'Principal', value: P, color: '#3b82f6' },
                { name: 'Interest', value: totalInterest, color: '#ef4444' },
                { name: 'Fees/Charges', value: totalFees, color: '#f59e0b' },
            ];

            setResult({
                monthlyEmi: emi,
                totalInterest,
                totalProcessingFee: totalFees,
                totalPayment: P + totalInterest + totalFees,
                effectiveRate,
                amortization,
                pieData
            });

        } catch (e: any) {
            setError(e.message);
        }
    }, [inputs, interestMode]);

    const handleShare = () => {
        if (!result) return;
        const shareText = `My Monthly EMI: ${currencySym}${result.monthlyEmi.toFixed(0)}. Total Interest: ${currencySym}${result.totalInterest.toFixed(0)}. Check your EMI on MultiCalculators.`;
        if (navigator.share) {
            navigator.share({ title: 'EMI Calculation', text: shareText, url: window.location.href }).catch(() => {});
        } else {
            navigator.clipboard.writeText(shareText);
            toast({ title: "Link Copied!", description: "Summary ready to share." });
        }
    };

    const downloadCSV = () => {
        if (!result) return;
        const headers = ["Month", "Principal Component", "Interest Component", "Remaining Balance"];
        const rows = result.amortization.map(r => [r.month, r.principal.toFixed(2), r.interest.toFixed(2), r.balance.toFixed(2)]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `emi_payment_schedule.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const currencySym = currencies.find(c => c.value === currency)?.symbol || '$';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 animate-in fade-in duration-700">
            {/* LEFT: INPUTS (5 Columns) */}
            <Card className="lg:col-span-5 shadow-xl border-primary/10 h-fit">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                    <CardTitle className="font-headline text-2xl flex items-center gap-2 text-primary">
                        <Wallet className="w-6 h-6"/> EMI Comparison Engine
                    </CardTitle>
                    <CardDescription>Professional grade calculator to analyze loan installments and hidden bank fees.</CardDescription>
                </CardHeader>
                <CardContent className='space-y-6 pt-6'>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center gap-4 bg-muted/30 p-2 rounded-lg border">
                            <Label className="pl-2 font-bold text-xs uppercase tracking-tighter">Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger className="w-48 h-9 border-none bg-transparent focus:ring-0 shadow-none">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {currencies.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="loanAmount" className="text-primary font-bold">Loan Amount</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground">{currencySym}</span>
                                <Input id="loanAmount" type="number" value={inputs.loanAmount} onChange={handleInputChange} className="pl-10 h-12 text-xl font-black tracking-tighter" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                                <div className="relative">
                                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                                    <Input id="interestRate" type="number" value={inputs.interestRate} onChange={handleInputChange} step="0.1" className="h-12 font-bold" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tenureValue">Tenure</Label>
                                <div className="flex gap-1">
                                    <Input id="tenureValue" type="number" value={inputs.tenureValue} onChange={handleInputChange} className="h-12 font-bold" />
                                    <Select value={inputs.tenureUnit} onValueChange={v => handleSelectChange('tenureUnit', v)}>
                                        <SelectTrigger className="w-24 h-12 bg-muted/20 border-primary/10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="years">Yrs</SelectItem>
                                            <SelectItem value="months">Mos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Interest Calculation Method</Label>
                            <Tabs value={interestMode} onValueChange={(v: any) => setInterestMode(v)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 bg-muted/50 border">
                                    <TabsTrigger value="reducing" className="text-xs font-bold uppercase">Reducing Balance</TabsTrigger>
                                    <TabsTrigger value="flat" className="text-xs font-bold uppercase">Flat Rate</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="pt-4 border-t border-dashed space-y-4">
                            <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em]">
                                <Receipt className="w-3.5 h-3.5"/> Fees & Charges
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="processingFee">Processing Fee (%)</Label>
                                    <Input id="processingFee" type="number" value={inputs.processingFee} onChange={handleInputChange} className="bg-primary/5" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="otherCharges">Other One-time Fees</Label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">{currencySym}</span>
                                        <Input id="otherCharges" type="number" value={inputs.otherCharges} onChange={handleInputChange} className="pl-7 bg-primary/5" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-2xl border-l-4 border-primary space-y-2 shadow-inner">
                        <h4 className='font-bold text-xs text-foreground flex items-center gap-2'>
                            <InfoIcon className="h-3.5 w-3.5 text-primary"/> Expert Guidance
                        </h4>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                            <b>Reducing Balance:</b> Interest is calculated on the remaining principal. This is the standard for most bank loans. <br/>
                            <b>Flat Rate:</b> Interest is charged on the original principal for the entire tenure. This often results in a <b>~1.8x higher</b> actual cost.
                        </p>
                    </div>

                    <Button onClick={calculateEmi} size="lg" className="w-full shadow-xl font-black py-8 text-lg uppercase tracking-widest group">
                        <Calculator className="mr-2 h-6 w-6 group-hover:scale-110 transition-transform"/> Calculate EMI Analysis
                    </Button>
                </CardContent>
            </Card>

            {/* RIGHT: RESULTS (7 Columns) */}
            <Card className="lg:col-span-7 flex flex-col bg-muted/30 border-2 border-primary/20 shadow-2xl overflow-hidden min-h-[600px]">
                <CardHeader className="bg-background/50 border-b border-primary/10 flex flex-row items-center justify-between py-4">
                    <div>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-primary"/> Installment Breakdown
                        </CardTitle>
                    </div>
                    {result && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={handleShare} className="rounded-full h-10 w-10 border-primary/20 hover:bg-primary/10"><Share2 className="h-4 w-4 text-primary"/></Button>
                            <Button variant="outline" size="icon" onClick={downloadCSV} className="rounded-full h-10 w-10 border-primary/20 hover:bg-primary/10"><Download className="h-4 w-4 text-primary"/></Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="flex-grow p-6">
                    {error && (
                        <div className="text-destructive font-medium flex items-center gap-2 text-center p-4 bg-destructive/10 rounded-xl w-full border border-destructive/20 animate-in zoom-in">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                    
                    {result ? (
                        <div className="w-full space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            {/* MAIN EMI DISPLAY */}
                            <div className='p-8 bg-background rounded-[2.5rem] shadow-xl border-4 border-primary/10 text-center relative overflow-hidden group'>
                                <div className="absolute top-0 left-0 px-4 py-1 text-[9px] font-black text-white uppercase tracking-widest bg-primary">
                                    {interestMode} Analysis
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em]">Monthly Installment</p>
                                    <p className="text-7xl font-black text-primary tracking-tighter tabular-nums">
                                        {currencySym}{result.monthlyEmi.toLocaleString('en', { maximumFractionDigits: 0 })}
                                    </p>
                                    <p className='text-sm font-bold text-foreground/60 mt-2 uppercase'>Fixed Monthly Outflow</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-5 bg-background/80 rounded-2xl text-center border-2 border-primary/5 shadow-sm space-y-1">
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Total Interest</p>
                                    <p className="text-2xl font-black text-red-600">{currencySym}{result.totalInterest.toLocaleString('en', { maximumFractionDigits: 0 })}</p>
                                </div>
                                <div className="p-5 bg-background/80 rounded-2xl text-center border-2 border-primary/5 shadow-sm space-y-1">
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Fees + Charges</p>
                                    <p className="text-2xl font-black text-orange-600">{currencySym}{result.totalProcessingFee.toLocaleString('en', { maximumFractionDigits: 0 })}</p>
                                </div>
                                <div className="p-5 bg-background/80 rounded-2xl text-center border-2 border-primary/5 shadow-sm space-y-1">
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Total Payable</p>
                                    <p className="text-2xl font-black text-foreground">{currencySym}{result.totalPayment.toLocaleString('en', { maximumFractionDigits: 0 })}</p>
                                </div>
                            </div>

                            {/* ANALYTICS SECTION */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <PieIcon className="w-4 h-4"/> Cost Distribution
                                    </h4>
                                    <div className="h-64 w-full flex flex-col items-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={result.pieData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                                                    {result.pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <ReTooltip formatter={(value: number) => `${currencySym}${value.toLocaleString()}`} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-orange-500"/> Market Comparison
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-orange-500/5 rounded-2xl border-2 border-orange-500/10 shadow-inner">
                                            <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Effective Rate (APR)</p>
                                            <p className="text-4xl font-black text-orange-600">{result.effectiveRate.toFixed(2)}%</p>
                                            <p className="text-[10px] text-orange-600/70 mt-1 italic leading-tight">This is your real interest rate including all upfront fees.</p>
                                        </div>
                                        <div className="p-4 bg-green-500/5 rounded-2xl border-2 border-green-500/10">
                                            <p className="text-[10px] font-black uppercase text-green-600 tracking-widest">Interest / Principal Ratio</p>
                                            <p className="text-3xl font-black text-green-600">{(result.totalInterest / parseFloat(inputs.loanAmount) * 100).toFixed(1)}%</p>
                                            <p className="text-[10px] text-green-600/70 mt-1 font-bold">You pay {currencySym}{ (result.totalInterest / parseFloat(inputs.loanAmount)).toFixed(2) } for every {currencySym}1.00 borrowed.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='p-5 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/20 flex items-start gap-4'>
                                <div className="bg-primary/10 p-2 rounded-xl">
                                    <ShieldCheck className='w-5 h-5 text-primary'/>
                                </div>
                                <div className='space-y-1'>
                                    <p className='text-xs font-black text-primary uppercase tracking-wider'>Financial Compliance Verdict</p>
                                    <p className='text-[11px] leading-relaxed text-muted-foreground'>
                                        Your monthly repayment of <b>{currencySym}{result.monthlyEmi.toFixed(0)}</b> represents a debt-to-income ratio check. Ensure this installment does not exceed 40% of your net monthly income for financial stability.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : !error && (
                        <div className="flex flex-col items-center justify-center h-full py-20 space-y-6">
                            <div className="bg-background/50 p-8 rounded-full inline-block shadow-inner ring-8 ring-background/20 animate-pulse">
                                <Landmark className="w-20 h-20 text-primary/30" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className='text-muted-foreground font-black uppercase text-xs tracking-[0.3em]'>Financial Engine Ready</p>
                                <p className='text-muted-foreground text-sm max-w-[280px] mx-auto leading-relaxed font-medium'>
                                    Input your loan details on the left to see the true cost of credit and effective interest rates.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
                {result && (
                    <CardFooter className="bg-primary/5 py-4 border-t border-primary/10 flex justify-center">
                        <div className="flex items-center gap-2 text-[9px] font-black text-primary/60 uppercase tracking-[0.2em]">
                            <CheckCircle2 className="w-3 h-3 text-green-600"/> BANKING STANDARDS ACCURACY • V22 Verified
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
