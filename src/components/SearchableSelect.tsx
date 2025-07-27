"use client";
import { useState, useEffect, useRef } from "react";

interface Option {
  id: number | string;
  nombre: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  name: string;
  required?: boolean;
  loading?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  name,
  required = false,
  loading = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtrar opciones basado en el término de búsqueda
  const filteredOptions = options.filter((option) =>
    option.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Encontrar la opción seleccionada y mostrar su nombre
  useEffect(() => {
    if (value) {
      const selectedOption = options.find((option) => option.nombre === value);
      setDisplayValue(selectedOption ? selectedOption.nombre : value);
    } else {
      setDisplayValue("");
    }
  }, [value, options]);

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputClick = () => {
    setIsOpen(true);
    setSearchTerm(displayValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleOptionSelect = (option: Option) => {
    onChange(option.nombre);
    setDisplayValue(option.nombre);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        name={name}
        value={isOpen ? searchTerm : displayValue}
        onChange={handleInputChange}
        onClick={handleInputClick}
        onKeyDown={handleKeyDown}
        placeholder={loading ? "Cargando..." : placeholder}
        className="input w-full pr-8"
        required={required}
        disabled={loading}
        autoComplete="off"
      />
      
      {/* Icono de dropdown */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* Dropdown */}
      {isOpen && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => handleOptionSelect(option)}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700 text-black dark:text-white"
              >
                {option.nombre}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500 dark:text-neutral-400">
              No se encontraron resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}