import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";

describe("Table components", () => {
  describe("Table", () => {
    it("renders a table element", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("wraps table in overflow container", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const table = screen.getByRole("table");
      expect(table.parentElement).toHaveClass("overflow-auto");
    });

    it("applies custom className", () => {
      render(
        <Table className="custom-table-class">
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole("table")).toHaveClass("custom-table-class");
    });

    it("has displayName", () => {
      expect(Table.displayName).toBe("Table");
    });
  });

  describe("TableHeader", () => {
    it("renders a thead element", () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      expect(screen.getByRole("rowgroup")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <Table>
          <TableHeader className="custom-header-class">
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      const header = screen.getByRole("rowgroup");
      expect(header).toHaveClass("custom-header-class");
    });

    it("has displayName", () => {
      expect(TableHeader.displayName).toBe("TableHeader");
    });
  });

  describe("TableBody", () => {
    it("renders a tbody element", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole("rowgroup")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <Table>
          <TableBody className="custom-body-class">
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const body = screen.getByRole("rowgroup");
      expect(body).toHaveClass("custom-body-class");
    });

    it("has displayName", () => {
      expect(TableBody.displayName).toBe("TableBody");
    });
  });

  describe("TableFooter", () => {
    it("renders a tfoot element", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter data-testid="table-footer">
            <TableRow>
              <TableCell>Footer</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByTestId("table-footer")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter className="custom-footer-class" data-testid="table-footer">
            <TableRow>
              <TableCell>Footer</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByTestId("table-footer")).toHaveClass("custom-footer-class");
    });

    it("has displayName", () => {
      expect(TableFooter.displayName).toBe("TableFooter");
    });
  });

  describe("TableRow", () => {
    it("renders a tr element", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole("row")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <Table>
          <TableBody>
            <TableRow className="custom-row-class">
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole("row")).toHaveClass("custom-row-class");
    });

    it("has displayName", () => {
      expect(TableRow.displayName).toBe("TableRow");
    });
  });

  describe("TableHead", () => {
    it("renders a th element", () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      expect(screen.getByRole("columnheader")).toBeInTheDocument();
      expect(screen.getByText("Header")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="custom-head-class">Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      expect(screen.getByRole("columnheader")).toHaveClass("custom-head-class");
    });

    it("has displayName", () => {
      expect(TableHead.displayName).toBe("TableHead");
    });
  });

  describe("TableCell", () => {
    it("renders a td element", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole("cell")).toBeInTheDocument();
      expect(screen.getByText("Cell content")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="custom-cell-class">Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole("cell")).toHaveClass("custom-cell-class");
    });

    it("has displayName", () => {
      expect(TableCell.displayName).toBe("TableCell");
    });
  });

  describe("TableCaption", () => {
    it("renders a caption element", () => {
      render(
        <Table>
          <TableCaption>Table caption</TableCaption>
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText("Table caption")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <Table>
          <TableCaption className="custom-caption-class">Caption</TableCaption>
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText("Caption")).toHaveClass("custom-caption-class");
    });

    it("has displayName", () => {
      expect(TableCaption.displayName).toBe("TableCaption");
    });
  });

  describe("full table example", () => {
    it("renders a complete table with all components", () => {
      render(
        <Table>
          <TableCaption>A list of users</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
              <TableCell>john@example.com</TableCell>
              <TableCell>Admin</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Jane Smith</TableCell>
              <TableCell>jane@example.com</TableCell>
              <TableCell>User</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter data-testid="footer">
            <TableRow>
              <TableCell colSpan={3}>Total: 2 users</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("A list of users")).toBeInTheDocument();
      expect(screen.getAllByRole("columnheader")).toHaveLength(3);
      expect(screen.getAllByRole("row")).toHaveLength(4); // 1 header + 2 body + 1 footer
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Total: 2 users")).toBeInTheDocument();
    });
  });
});
