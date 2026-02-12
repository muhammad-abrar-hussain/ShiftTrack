import { useState, useCallback, useRef } from "react";
import { useUploadShiftReportMutation } from "@/store/api/apiSlice";
import {
    Upload, FileText, CheckCircle2,
    Loader2, ArrowRight, ShieldCheck, Database,
    LayoutDashboard
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadShiftReport, { isLoading, isSuccess, data: result }] = useUploadShiftReportMutation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === "application/pdf") {
            setFile(droppedFile);
        } else {
            toast.error("Please upload a PDF file");
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            console.log("Starting upload...", file.name);
            setUploadProgress(20);
            const response = await uploadShiftReport(formData).unwrap();
            console.log("Upload successful:", response);
            setUploadProgress(100);
            toast.success("Shift report processed successfully!");
        } catch (error: any) {
            console.error("Upload failed:", error);
            toast.error(error?.data?.detail || "Failed to upload file");
            setUploadProgress(0);
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-8">
            <div className="space-y-2 text-center">
                <div className="inline-flex items-center justify-center p-2 rounded-full bg-primary/10 mb-4">
                    <Upload className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground">Import Shift Data</h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Upload your "Scheduled vs Actual Hours" PDF report to automatically update
                    analytics, employee records, and compliance alerts.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Upload Area */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={triggerFileSelect}
                        className={`
              relative overflow-hidden glass-card p-12 flex flex-col items-center justify-center border-2 border-dashed transition-all duration-300 cursor-pointer
              ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/50 hover:border-primary/50"}
              ${file ? "bg-primary/5 border-primary/30" : ""}
            `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={isLoading}
                        />

                        <div className={`
              h-20 w-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500
              ${file ? "bg-primary text-primary-foreground rotate-0" : "bg-muted text-muted-foreground -rotate-6"}
            `}>
                            {isLoading ? (
                                <Loader2 className="h-10 w-10 animate-spin" />
                            ) : file ? (
                                <FileText className="h-10 w-10" />
                            ) : (
                                <Upload className="h-10 w-10" />
                            )}
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold">
                                {file ? file.name : "Choose a PDF report"}
                            </h3>
                            <p className="text-muted-foreground">
                                {file ? `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB` : "Drag and drop or click to browse"}
                            </p>
                        </div>

                        {file && !isLoading && !isSuccess && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // VERY important to stop the triggerFileSelect on parent
                                    console.log("Start Processing button clicked");
                                    handleUpload();
                                }}
                                className="mt-8 relative z-20 flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold hover:glow-primary/40 transition-all hover:scale-105 active:scale-95"
                            >
                                Start Processing
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        )}

                        {isLoading && (
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-muted">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Result Summary */}
                    {isSuccess && result && (
                        <div className="glass-card p-6 border-status-success/30 bg-status-success/5 animate-scale-in">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-full bg-status-success/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-5 w-5 text-status-success" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Processing Complete</h3>
                                    <p className="text-sm text-muted-foreground">Successfully imported data from {result.filename}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="glass-card p-3 text-center bg-background/50">
                                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Total Records</div>
                                    <div className="text-2xl font-bold text-primary">{result.stats.total_records}</div>
                                </div>
                                <div className="glass-card p-3 text-center bg-background/50">
                                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Imported</div>
                                    <div className="text-2xl font-bold text-status-success">{result.stats.summaries_inserted}</div>
                                </div>
                                <div className="glass-card p-3 text-center bg-background/50">
                                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Punches</div>
                                    <div className="text-2xl font-bold text-accent">{result.stats.punches_inserted}</div>
                                </div>
                                <div className="glass-card p-3 text-center bg-background/50">
                                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Errors</div>
                                    <div className="text-2xl font-bold text-status-error">{result.stats.errors}</div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setFile(null)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                                >
                                    Upload Another
                                </button>
                                <Link
                                    to="/"
                                    className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-all"
                                >
                                    <LayoutDashboard className="h-4 w-4" />
                                    View Dashboard
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="glass-card p-6 space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            Upload Guidelines
                        </h3>
                        <ul className="text-sm space-y-3 text-muted-foreground">
                            <li className="flex gap-2">
                                <div className="h-1 w-1 rounded-full bg-primary mt-2 shrink-0" />
                                Supports standard Burger King "Scheduled vs Actual Hours" PDF reports.
                            </li>
                            <li className="flex gap-2">
                                <div className="h-1 w-1 rounded-full bg-primary mt-2 shrink-0" />
                                Ensure the PDF is not password protected.
                            </li>
                            <li className="flex gap-2">
                                <div className="h-1 w-1 rounded-full bg-primary mt-2 shrink-0" />
                                Scanning might take a few seconds depending on file size.
                            </li>
                            <li className="flex gap-2">
                                <div className="h-1 w-1 rounded-full bg-primary mt-2 shrink-0" />
                                Duplicate records for same employee/date are ignored.
                            </li>
                        </ul>
                    </div>

                    <div className="glass-card p-6 space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Database className="h-4 w-4 text-accent" />
                            Automated Pipeline
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Once uploaded, our system performs the following steps:
                        </p>
                        <div className="space-y-4">
                            {[
                                { title: "Extraction", desc: "Digital text scraping" },
                                { title: "Normalization", desc: "Data cleaning & formatting" },
                                { title: "Indexing", desc: "SQL Database storage" },
                                { title: "Analysis", desc: "Recalculating KPIs" }
                            ].map((step, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-foreground uppercase">{step.title}</div>
                                        <div className="text-[11px] text-muted-foreground">{step.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
