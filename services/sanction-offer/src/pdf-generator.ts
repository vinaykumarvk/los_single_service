/**
 * PDF Generation for Sanction Letters
 * Generates offer/sanction letter PDFs with terms and conditions
 */

import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';

export interface SanctionLetterData {
  sanctionId: string;
  applicationId: string;
  applicantName: string;
  sanctionedAmount: number;
  tenureMonths: number;
  rateAnnual: number;
  emi: number;
  offerUrl?: string;
  validTill: string;
  productName?: string;
  companyName?: string;
  companyAddress?: string;
  termsAndConditions?: string[];
}

/**
 * Generate a sanction letter PDF
 */
export async function generateSanctionLetterPDF(data: SanctionLetterData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 72, bottom: 72, left: 72, right: 72 }
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // Header
      doc.fontSize(20).font('Helvetica-Bold')
         .text(data.companyName || 'Loan Origination System', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica-Bold')
         .text('SANCTION LETTER', { align: 'center' });
      doc.moveDown(1);
      
      // Date and Reference
      doc.fontSize(10).font('Helvetica')
         .text(`Date: ${new Date().toLocaleDateString('en-IN')}`, { align: 'right' });
      doc.text(`Reference No.: ${data.sanctionId}`, { align: 'right' });
      doc.moveDown(1);
      
      // Applicant Details
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Dear Customer,');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica')
         .text(`We are pleased to inform you that your loan application (Application ID: ${data.applicationId}) has been approved.`, {
           align: 'justify'
         });
      doc.moveDown(1);
      
      // Sanction Details
      doc.fontSize(12).font('Helvetica-Bold')
         .text('SANCTION DETAILS:', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(11).font('Helvetica')
         .text(`Applicant Name: ${data.applicantName}`)
         .moveDown(0.3)
         .text(`Product: ${data.productName || 'Personal Loan'}`)
         .moveDown(0.3)
         .text(`Sanctioned Amount: ₹${data.sanctionedAmount.toLocaleString('en-IN')}`)
         .moveDown(0.3)
         .text(`Tenure: ${data.tenureMonths} months`)
         .moveDown(0.3)
         .text(`Annual Interest Rate: ${data.rateAnnual}%`)
         .moveDown(0.3)
         .font('Helvetica-Bold')
         .text(`EMI: ₹${data.emi.toLocaleString('en-IN')} per month`)
         .font('Helvetica')
         .moveDown(0.3)
         .text(`Valid Till: ${new Date(data.validTill).toLocaleDateString('en-IN')}`);
      doc.moveDown(1);
      
      // Terms and Conditions
      doc.fontSize(12).font('Helvetica-Bold')
         .text('TERMS AND CONDITIONS:', { underline: true });
      doc.moveDown(0.5);
      
      const defaultTerms = [
        'This sanction is valid until the expiry date mentioned above.',
        'Acceptance of this offer must be done within the validity period.',
        'The final loan disbursement is subject to verification of all documents and fulfillment of all terms.',
        'Interest rates are subject to change as per market conditions.',
        'All applicable charges and fees will be as per the loan agreement.',
        'This sanction is subject to verification of KYC documents and compliance with regulatory requirements.'
      ];
      
      const terms = data.termsAndConditions || defaultTerms;
      terms.forEach((term, index) => {
        doc.fontSize(10).font('Helvetica')
           .text(`${index + 1}. ${term}`, { indent: 20 });
      });
      doc.moveDown(1);
      
      // Footer
      doc.fontSize(10).font('Helvetica')
         .text('This is a computer-generated document and does not require a signature.', { align: 'center', italic: true });
      doc.moveDown(0.5);
      
      if (data.companyAddress) {
        doc.text(data.companyAddress, { align: 'center' });
      }
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

