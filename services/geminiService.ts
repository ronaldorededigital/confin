import { GoogleGenAI } from "@google/genai";
import { Transaction, FinancialSummary } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFinancialInsights = async (
  transactions: Transaction[],
  summary: FinancialSummary,
  userName: string,
  month: string,
  year: number
): Promise<string[]> => {
  try {
    const hasData = transactions.length > 0;

    let promptContext = "";
    
    if (!hasData) {
      promptContext = `
        O usuário ${userName} ainda não registrou nenhuma transação para ${month} de ${year}.
        O saldo atual é zero.
        Gere 3 insights curtos e amigáveis em Português do Brasil sugerindo que ele comece a registrar seus gastos, 
        a importância de planejar o mês, e uma dica genérica de economia.
      `;
    } else {
      promptContext = `
        Dados financeiros de ${userName} para ${month}/${year}:
        - Receita Total: R$ ${summary.income.toFixed(2)}
        - Despesas Fixas: R$ ${summary.fixedExpenses.toFixed(2)}
        - Parcelamentos: R$ ${summary.installments.toFixed(2)}
        - Balanço Final: R$ ${summary.balance.toFixed(2)}
        
        Transações recentes: ${JSON.stringify(transactions.slice(0, 5))}
        
        Atue como um consultor financeiro pessoal inteligente chamado "ConFinance IA".
        Gere 3 insights breves (máximo 1 frase longa cada), motivadores ou de alerta, em Português do Brasil.
        Foque em: saúde financeira, corte de gastos desnecessários ou parabéns por saldo positivo.
      `;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptContext,
      config: {
        systemInstruction: "Você é a ConFinance IA, uma assistente financeira concisa e útil. Responda sempre com uma lista JSON de strings.",
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return ["Não foi possível gerar insights no momento."];

    // Simple parsing assuming the model follows the JSON list instruction
    try {
      const insights = JSON.parse(text);
      if (Array.isArray(insights)) {
        return insights;
      }
      return [text];
    } catch (e) {
      return [text]; // Fallback if not valid JSON
    }

  } catch (error) {
    console.error("Error generating insights:", error);
    return [
      "Não foi possível conectar à ConFinance IA no momento.",
      "Verifique sua conexão ou tente novamente mais tarde."
    ];
  }
};