// src/pages/Home.jsx
import React from "react";
import Navbar from "../components/navbar";
import { Button } from "./../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)]">
      <div className="container mx-auto px-4 py-6">
        <Navbar />

        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Left Side Content */}
          <div className="max-w-md">
            <h2 className="text-5xl font-bold text-white mb-2">
              *Comentario Bonito De Slogan*
            </h2>
            <p className="text-sm text-gray-400 mb-8">
              *OTRO COMENTARIO CHULO*
            </p>

            <Button className="bg-gradient-to-r from-blue-400 to-purple-400 hover:opacity-90 text-white px-10 py-6 text-xl rounded-xl">
              Explorar
            </Button>
          </div>

          {/* Right Side Cards */}
          <div className="relative w-72 h-80">
            <div className="absolute right-0 top-0 rotate-6 z-10">
              <Card className="w-64 h-72 bg-gradient-to-b from-purple-400 to-blue-400 rounded-xl shadow-xl">
                <CardContent className="flex flex-col items-center justify-center h-full p-6">
                  <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-4">
                    <div className="w-16 h-10 flex flex-col gap-1 items-center">
                      <div className="w-full h-1 bg-white rounded-full"></div>
                      <div className="w-full h-1 bg-white rounded-full"></div>
                      <div className="w-full h-1 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="text-center text-white">
                    <p className="text-xs">*Comentario*</p>
                    <p className="font-bold">Comentario</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="absolute right-4 top-4 -rotate-3 z-0">
              <Card className="w-64 h-72 bg-gradient-to-b from-purple-300 to-blue-300 rounded-xl shadow-lg opacity-70">
                <CardContent className="flex flex-col items-center justify-center h-full p-6">
                  <div className="text-center text-white">
                    <p className="text-xs">*Comentario*</p>
                    <p className="font-bold">Comentario</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
